export default () => ({
  app: {
    port: parseInt(process.env.BACKEND_PORT ?? '3001', 10),
    env: process.env.NODE_ENV ?? 'development',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'finance_db',
    user: process.env.DB_USER ?? 'finance_user',
    password: process.env.DB_PASSWORD ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3001/auth/google/callback',
  },
  exchangeRate: {
    apiKey: process.env.EXCHANGE_RATE_API_KEY ?? '',
    cacheTtlMinutes: parseInt(
      process.env.EXCHANGE_RATE_CACHE_TTL_MINUTES ?? '60',
      10,
    ),
  },
});
