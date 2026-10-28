import express from 'express';
import {
  getTokens,
  getUserProfile,
  buildAffinityProfile,
  getValidUserAccessToken,
  spotifyFailure,
  spotifyErrorPayload
} from '../services/spotify.js';

const router = express.Router();

function sessionUserFromProfile(profile) {
  if (!profile) return null;
  const image = Array.isArray(profile.images) ? profile.images.find((item) => item?.url)?.url || null : null;
  return {
    id: profile.id || null,
    displayName: profile.display_name || profile.id || null,
    image
  };
}

export async function handleSpotifyCallback(req, res) {
  const { code, state, error: spotifyError } = req.query;

  if (spotifyError) {
    const reason = spotifyError === 'access_denied' ? 'access_denied' : 'spotify_error';
    return res.redirect(`/#callback=error&reason=${reason}`);
  }

  if (!state || !req.session?.state || state !== req.session.state) {
    return res.redirect('/#callback=error&reason=state');
  }

  const codeVerifier = req.session.codeVerifier;
  delete req.session.state;
  delete req.session.codeVerifier;

  if (!code) {
    return res.redirect('/#callback=error&reason=missing_code');
  }

  if (!codeVerifier) {
    return res.redirect('/#callback=error&reason=missing_verifier');
  }

  try {
    const tokens = await getTokens(code, codeVerifier);

    // Guardamos una instantánea mínima del perfil para que la navbar pueda
    // mostrar la cuenta incluso si Spotify falla al pedir /me más tarde.
    let user = null;
    let profileError = null;
    try {
      const profile = await getUserProfile(tokens.accessToken);
      user = sessionUserFromProfile(profile);
    } catch (error) {
      profileError = spotifyFailure(error);
      console.warn('Spotify profile lookup failed after login:', JSON.stringify(profileError));
    }

    req.session.spotify = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      scope: tokens.scope || null,
      user,
      profileError
    };

    // Si Spotify bloqueó /me, avisamos en la URL para que la interfaz explique
    // el 403 en lugar de mostrar un "conectado" engañoso.
    const profileStatus = profileError?.status || null;
    const profileQuery = profileError
      ? `&profile=${profileStatus === 403 ? 'forbidden' : 'error'}`
      : '';

    // cookie-session escribe la cookie firmada al finalizar esta respuesta.
    return res.redirect(`/#callback=success${profileQuery}`);
  } catch (error) {
    console.error('Spotify token exchange failed:', JSON.stringify(spotifyFailure(error)));
    return res.redirect('/#callback=error&reason=token');
  }
}

router.get('/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const spotify = req.session?.spotify;
  res.json({
    authenticated: Boolean(spotify?.accessToken),
    user: spotify?.user || null,
    expiresAt: spotify?.expiresAt || null,
    scope: spotify?.scope || null,
    profileError: spotify?.profileError || null
  });
});

function profileFromSessionUser(user) {
  if (!user) return null;
  return {
    id: user.id || null,
    display_name: user.displayName || user.id || null,
    images: user.image ? [{ url: user.image }] : []
  };
}

/**
 * Perfil de emergencia cuando Spotify responde 403. La sesión sigue siendo
 * válida, así que la app puede mostrar que la cuenta está conectada aunque no
 * pueda leer el nombre ni la foto.
 */
function unavailableProfile(failure) {
  return {
    id: null,
    display_name: 'Cuenta de Spotify',
    images: [],
    profileUnavailable: true,
    profileError: failure || null
  };
}

router.get('/me', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const sessionUser = req.session?.spotify?.user || null;
  const accessToken = await getValidUserAccessToken(req.session);

  if (!accessToken) {
    // La sesión pudo caducar, pero si guardamos la instantánea del perfil la
    // mostramos para no dar la impresión de que la cuenta desapareció.
    if (!req.session?.spotify) return res.json(null);
    return res.json(profileFromSessionUser(sessionUser) || unavailableProfile(req.session.spotify.profileError || null));
  }

  try {
    const profile = await getUserProfile(accessToken);
    if (req.session?.spotify) {
      req.session.spotify = {
        ...req.session.spotify,
        user: sessionUserFromProfile(profile),
        profileError: null
      };
    }
    res.json(profile);
  } catch (error) {
    const failure = spotifyFailure(error);
    console.warn('Spotify /me failed:', JSON.stringify(failure));

    // 401 significa token inválido: la sesión ya no sirve. Se limpia para que
    // la interfaz vuelva a pedir login en lugar de mostrar una cuenta fantasma.
    if (failure.status === 401) {
      if (req.session) req.session.spotify = null;
      return res.json(null);
    }

    if (req.session?.spotify) {
      req.session.spotify = { ...req.session.spotify, profileError: failure };
    }

    const fallback = profileFromSessionUser(sessionUser);
    if (fallback) return res.json(fallback);

    // 200 con un perfil de emergencia: la sesión es válida, solo falla la
    // lectura del perfil. Así la interfaz no muestra "sin conectar".
    return res.json(unavailableProfile(failure));
  }
});

router.get('/profile/affinity', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) return res.json(null);

  try {
    const affinity = await buildAffinityProfile(accessToken);
    if (req.session?.spotify) {
      req.session.spotify = { ...req.session.spotify, profileError: null };
    }
    res.json(affinity);
  } catch (error) {
    const failure = spotifyFailure(error);
    console.warn('Spotify affinity lookup failed:', JSON.stringify(failure));

    if (failure.status === 401) {
      if (req.session) req.session.spotify = null;
    } else if (req.session?.spotify) {
      req.session.spotify = { ...req.session.spotify, profileError: failure };
    }

    const payload = spotifyErrorPayload(error, 'No se pudo calcular tu afinidad musical.');
    const status = failure.status === 403 ? 403 : failure.status === 401 ? 401 : 502;
    res.status(status).json({ error: payload });
  }
});

/**
 * Diagnóstico del token actual. Sirve para saber qué responde Spotify sin
 * exponer el access token. Ejemplo: /api/spotify/diagnostics
 */
router.get('/spotify/diagnostics', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const spotify = req.session?.spotify;

  if (!spotify?.accessToken) {
    return res.json({
      authenticated: false,
      message: 'No hay sesión de Spotify. Inicia sesión primero.'
    });
  }

  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) {
    return res.status(401).json({
      authenticated: false,
      message: 'La sesión de Spotify caducó. Vuelve a iniciar sesión.'
    });
  }

  const result = {
    authenticated: true,
    scope: spotify.scope || null,
    profile: null,
    hints: []
  };

  try {
    const profile = await getUserProfile(accessToken);
    result.profile = {
      ok: true,
      id: profile.id || null,
      displayName: profile.display_name || null,
      country: profile.country || null,
      product: profile.product || null
    };
  } catch (error) {
    const failure = spotifyFailure(error);
    result.profile = { ok: false, ...failure };

    if (failure.status === 403) {
      if (/premium/i.test(failure.spotifyMessage || '')) {
        result.hints = [
          `Spotify respondió: "${failure.spotifyMessage}"`,
          'Activa Spotify Premium en la cuenta dueña de la app (la cuenta que aparece como owner en Spotify Dashboard).',
          'Después de activarlo, Spotify puede tardar unas horas en desbloquear las peticiones.',
          'Mientras tanto el login funciona, pero /me y los artistas seguirán devolviendo 403.',
          'También confirma que la Web API está habilitada y que tu cuenta está en Users and Access.'
        ];
      } else {
        result.hints = [
          'Spotify Dashboard → tu app → Settings: confirma que la Web API está habilitada.',
          'Spotify Dashboard → Users and Access: añade el email exacto de la cuenta que inicia sesión.',
          'Development Mode exige que el dueño de la app tenga Spotify Premium activo.',
          'Si ya lo corregiste, cierra sesión y vuelve a entrar para obtener un token nuevo.',
          'Si todo está bien, puede ser un fallo temporal de Spotify; reintenta más tarde.'
        ];
      }
    } else if (failure.status === 401) {
      result.hints = ['El token caducó o fue revocado. Cierra sesión y vuelve a entrar.'];
    } else if (failure.status === 429) {
      result.hints = ['Spotify está limitando las solicitudes. Espera unos minutos.'];
    }
  }

  res.json(result);
});

export default router;
