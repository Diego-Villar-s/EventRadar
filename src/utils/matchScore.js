const ARTIST_EXACT_MATCH = 40;
const TOP_ARTIST_BONUS = 15;
const GENRE_MATCH = 30;
const POPULARITY_BONUS = 15;

function normalizeName(value) {
  return (value || '').trim().toLowerCase();
}

export function calculateMatchScore(spotifyProfile, event) {
  if (!spotifyProfile || !event) return 0;

  let score = 0;
  const eventArtists = Array.isArray(event.artists) ? event.artists : [];
  const profileArtists = Array.isArray(spotifyProfile.topArtists) ? spotifyProfile.topArtists : [];
  const eventGenres = Array.isArray(event.genres) ? event.genres : [];
  const profileGenres = Array.isArray(spotifyProfile.topGenres) ? spotifyProfile.topGenres : [];

  const matchedArtists = [];
  for (const eventArtist of eventArtists) {
    const name = normalizeName(eventArtist.name);
    if (!name) continue;
    const index = profileArtists.findIndex((artist) => normalizeName(artist.name) === name);
    if (index >= 0) matchedArtists.push({ index, artist: profileArtists[index] });
  }

  if (matchedArtists.length > 0) {
    score += ARTIST_EXACT_MATCH;
    if (matchedArtists.some((match) => match.index < 5)) {
      score += TOP_ARTIST_BONUS;
    }

    const highestPopularity = Math.max(
      ...matchedArtists.map((match) => Number(match.artist.popularity) || 0)
    );
    if (highestPopularity >= 70) score += POPULARITY_BONUS;
    else if (highestPopularity >= 50) score += 10;
    else if (highestPopularity >= 30) score += 5;
  }

  if (eventGenres.length > 0 && profileGenres.length > 0) {
    const normalizedProfileGenres = profileGenres
      .map((genre) => normalizeName(typeof genre === 'string' ? genre : genre.genre))
      .filter(Boolean);

    const matches = eventGenres.filter((eventGenre) => {
      const normalized = normalizeName(eventGenre);
      return normalizedProfileGenres.some(
        (profileGenre) => profileGenre.includes(normalized) || normalized.includes(profileGenre)
      );
    });

    if (matches.length > 0) {
      score += Math.round((matches.length / eventGenres.length) * GENRE_MATCH);
    }
  }

  return Math.min(Math.max(Math.round(score), 0), 100);
}

export function sortEventsByMatch(events, spotifyProfile) {
  return events
    .map((event) => ({
      ...event,
      matchScore: calculateMatchScore(spotifyProfile, event)
    }))
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return (a.datetime || '').localeCompare(b.datetime || '');
    });
}
