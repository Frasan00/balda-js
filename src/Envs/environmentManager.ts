import env from 'envitron';

interface RedisConnection {
  host: string;
  port: number;
  password: string;
}

export function getEnvDatabaseSqlConnection(): {
  type: 'mysql' | 'mariadb' | 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logs: boolean;
} | null {
  const type = (env.getEnv('DB_TYPE') as 'mysql' | 'mariadb') || 'postgres';
  const host = env.getEnv('DB_HOST') as string;
  const port = env.getEnv('DB_PORT') as number;
  const username = env.getEnv('DB_USERNAME') as string;
  const password = env.getEnv('DB_PASSWORD') as string;
  const database = env.getEnv('DB_DATABASE') as string;
  const synchronize = env.getEnv('DB_SYNCHRONIZE') as boolean;
  const logs = env.getEnv('DB_LOGS') as boolean;

  if (![type, host, port, username, password, database].every((value) => !!value)) {
    return null;
  }

  return {
    type,
    host,
    port,
    username,
    password,
    database,
    synchronize,
    logs,
  };
}

export function getEnvDatabaseRedisConnection(): RedisConnection | null {
  const host = env.getEnv('REDIS_HOST') as string;
  const port = env.getEnv('REDIS_PORT') as number;
  const password = env.getEnv('REDIS_PASSWORD') as string;

  if (!host || !port || !password) {
    return null;
  }

  return {
    host,
    port: port,
    password,
  };
}

export function getEnvMongoConnection(): string | null {
  const mongoUri = env.getEnv('MONGO_URI') as string;
  if (!mongoUri) {
    return null;
  }

  return mongoUri;
}

export function getEnvSmtpConnection(): {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
} | null {
  const host = env.getEnv('SMTP_HOST') as string;
  const port = env.getEnv('SMTP_PORT') as number;
  const user = env.getEnv('SMTP_USER') as string;
  const pass = env.getEnv('SMTP_PASS') as string;
  const secure = env.getEnv('SMTP_SECURE') as boolean;
  const from = env.getEnv('SMTP_FROM') as string;

  if (![host, port, user, pass, from].every((value) => !!value)) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    secure,
    from,
  };
}

export function getEnvTokenSecrets(): {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
} | null {
  const accessTokenSecret = env.getEnv('ACCESS_TOKEN_SECRET') as string;
  const refreshTokenSecret = env.getEnv('REFRESH_TOKEN_SECRET') as string;
  const accessTokenExpiresIn = env.getEnv('ACCESS_TOKEN_EXPIRES_IN') as string;
  const refreshTokenExpiresIn = env.getEnv('REFRESH_TOKEN_EXPIRES_IN') as string;

  if (
    ![accessTokenSecret, refreshTokenSecret, accessTokenExpiresIn, refreshTokenExpiresIn].every(
      (value) => !!value
    )
  ) {
    return null;
  }

  return {
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpiresIn,
    refreshTokenExpiresIn,
  };
}

env.createEnvSchema((schema) => {
  schema.throwErrorOnValidationFail = true;
  // TODO remove
  schema.envFilePath = './lib';
  schema.envFileHierarchy = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    '.env.local.development',
    '.env.local.production',
    '.env.local.test',
    '.development.env',
    '.production.env',
    '.test.env',
    '.staging.env',
  ];

  return {
    PORT: schema.number().range(0, 65535).optional(),
    HOST: schema.string().optional(),

    DB_TYPE: schema.string().optional(),
    DB_HOST: schema.string().optional(),
    DB_PORT: schema.number().range(0, 65535).optional(),
    DB_USERNAME: schema.string().optional(),
    DB_PASSWORD: schema.string().optional(),
    DB_DATABASE: schema.string().optional(),
    DB_SYNCHRONIZE: schema.boolean().optional(),

    REDIS_HOST: schema.string().optional(),
    REDIS_PORT: schema.number().range(0, 65535).optional(),
    REDIS_PASSWORD: schema.string().optional(),
    REDIS_DB: schema.number().range(0, 15).optional(),

    MONGO_URI: schema.string().optional(),

    ACCESS_TOKEN_SECRET: schema.string().optional(),
    REFRESH_TOKEN_SECRET: schema.string().optional(),
    ACCESS_TOKEN_EXPIRES_IN: schema.string().optional(),
    REFRESH_TOKEN_EXPIRES_IN: schema.string().optional(),

    SMTP_HOST: schema.string().optional(),
    SMTP_PORT: schema.number().range(0, 65535).optional(),
    SMTP_USER: schema.string().optional(),
    SMTP_PASS: schema.string().optional(),
    SMTP_FROM: schema.string().optional(),
    SMTP_SECURE: schema.boolean().optional(),
  };
});
