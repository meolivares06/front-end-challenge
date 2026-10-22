export const config = {
  port: Number(process.env.PORT ?? 3000),
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    accountsUrl: 'https://accounts.spotify.com/api/token',
    apiUrl: 'https://api.spotify.com/v1',
  },
};
