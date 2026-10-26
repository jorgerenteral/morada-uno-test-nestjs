// Every test run uses an isolated in-memory database and cheap password hashing.
process.env.DATABASE_PATH = ':memory:';
process.env.DATABASE_SYNCHRONIZE = 'true';
process.env.JWT_SECRET = 'testing-jwt-secret-with-enough-length';
process.env.BCRYPT_ROUNDS = '4';
