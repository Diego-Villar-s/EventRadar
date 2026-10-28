export function calculateMatchScore(spotifyProfile, event) {
  if (!spotifyProfile) return 0;
  
  let score = 0;
  const maxScore = 100;
  
  // Weight factors
  const ARTIST_EXACT_MATCH = 40;
  const GENRE_MATCH = 30;
  const TOP_ARTIST_BONUS = 20;
  const POPULARITY_BONUS = 10;
  
  // Check for exact artist match
  if (event.artists && spotifyProfile.topArtists) {
    const eventArtistNames = event.artists.map(a => a.name.toLowerCase());
    const spotifyArtistNames = spotifyProfile.topArtists.map(a => a.name.toLowerCase());
    
    // Check exact matches
    const exactMatches = eventArtistNames.filter(name => 
      spotifyArtistNames.includes(name)
    );
    
    if (exactMatches.length > 0) {
      // Higher score if it's in top artists
      const topMatch = exactMatches.some(name => 
        spotifyProfile.topArtists.slice(0, 5).map(a => a.name.toLowerCase()).includes(name)
      );
      score += topMatch ? ARTIST_EXACT_MATCH : ARTIST_EXACT_MATCH * 0.7;
    }
  }
  
  // Check genre matches
  if (event.genres && spotifyProfile.topGenres) {
    const eventGenres = event.genres.map(g => g.toLowerCase());
    const spotifyGenres = spotifyProfile.topGenres.map(g => g.genre.toLowerCase());
    
    const genreMatches = eventGenres.filter(eg => 
      spotifyGenres.some(sg => sg.includes(eg) || eg.includes(sg))
    );
    
    if (genreMatches.length > 0) {
      score += (genreMatches.length / Math.max(eventGenres.length, 1)) * GENRE_MATCH;
    }
  }
  
  // Bonus for top artists
  if (spotifyProfile.topArtists && event.artists) {
    const top5Artists = spotifyProfile.topArtists.slice(0, 5).map(a => a.name.toLowerCase());
    const eventArtistNames = event.artists.map(a => a.name.toLowerCase());
    const topArtistMatches = eventArtistNames.filter(name => top5Artists.includes(name));
    
    if (topArtistMatches.length > 0) {
      score += TOP_ARTIST_BONUS * (topArtistMatches.length / Math.min(event.artists.length, 2));
    }
  }
  
  // Normalize score
  score = Math.min(Math.max(Math.round(score), 0), maxScore);
  
  return score;
}

export function sortEventsByMatch(events, spotifyProfile) {
  return events.map(event => ({
    ...event,
    matchScore: calculateMatchScore(spotifyProfile, event)
  })).sort((a, b) => b.matchScore - a.matchScore);
}
