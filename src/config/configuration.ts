export interface AppConfig {
  port: number;
  database: {
    path: string;
    synchronize: boolean;
  };
  jwt: {
    secret: string;
    ttlSeconds: number;
  };
  bcryptRounds: number;
}

export default (): AppConfig => {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be defined in production');
  }

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    database: {
      path: process.env.DATABASE_PATH ?? 'bookstore.sqlite',
      synchronize: (process.env.DATABASE_SYNCHRONIZE ?? 'true') === 'true',
    },
    jwt: {
      secret: secret ?? 'dev-only-secret-change-me',
      ttlSeconds: parseInt(process.env.JWT_TTL ?? '3600', 10),
    },
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10),
  };
};
