export const spotifyToTicketmasterGenreMap = {
  'rock': ['rock', 'alternative', 'indie rock'],
  'pop': ['pop', 'dance pop'],
  'hip hop': ['hip-hop rap', 'rap'],
  'rap': ['hip-hop rap', 'rap'],
  'electronic': ['electronic', 'dance electronic', 'techno', 'house'],
  'dance': ['dance electronic', 'pop'],
  'techno': ['electronic', 'dance electronic'],
  'house': ['electronic', 'dance electronic'],
  'latin': ['latin', 'latin pop', 'reggaeton'],
  'reggaeton': ['latin', 'reggaeton'],
  'indie': ['indie', 'alternative'],
  'alternative': ['alternative', 'indie'],
  'metal': ['metal', 'hard rock'],
  'jazz': ['jazz', 'blues'],
  'r&b': ['r&b', 'soul'],
  'soul': ['r&b', 'soul'],
  'folk': ['folk', 'country'],
  'country': ['folk', 'country'],
  'punk': ['punk', 'alternative'],
  'blues': ['jazz', 'blues'],
  'funk': ['r&b', 'funk'],
  'disco': ['dance electronic', 'pop']
};

export function mapSpotifyGenreToTicketmaster(spotifyGenres = []) {
  const ticketmasterGenres = new Set();
  
  spotifyGenres.forEach(genre => {
    const lowerGenre = genre.toLowerCase();
    if (spotifyToTicketmasterGenreMap[lowerGenre]) {
      spotifyToTicketmasterGenreMap[lowerGenre].forEach(tmGenre => {
        ticketmasterGenres.add(tmGenre);
      });
    } else {
      // Try partial match
      for (const [key, values] of Object.entries(spotifyToTicketmasterGenreMap)) {
        if (lowerGenre.includes(key) || key.includes(lowerGenre)) {
          values.forEach(tmGenre => ticketmasterGenres.add(tmGenre));
          break;
        }
      }
    }
  });
  
  return Array.from(ticketmasterGenres);
}
