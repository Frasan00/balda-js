import {
  getEnvDatabaseRedisConnection,
  getEnvDatabaseSqlConnection,
  getEnvMongoConnection,
  getEnvSmtpConnection,
} from '../Envs/environmentManager';
import { DataSource } from 'typeorm';
import ServerOptions from './ServerTypes';
import { createClient, RedisClientType } from 'redis';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

export type ServicesType = {
  datasource: DataSource;
  redisClient: RedisClientType;
  mongoClient: mongoose.Mongoose;
  mailer: nodemailer.Transporter;
};

export async function parseServices(
  services?: ServerOptions['services'],
  onServiceStartUp?: ServerOptions['onServiceStartUp'],
  entities?: any[]
): Promise<ServicesType> {
  let datasource: DataSource | null = null;
  let redisClient;
  let mongoClient: mongoose.Mongoose | null = null;
  let mailer: nodemailer.Transporter | null = null;

  if (services?.sql) {
    datasource = await parseSqlService(entities);
    onServiceStartUp?.sql?.();
  }

  if (services?.redis) {
    redisClient = await parseRedisService();
    onServiceStartUp?.redis?.();
  }

  if (services?.mongo) {
    mongoClient = await parseMongoService();
    onServiceStartUp?.mongo?.();
  }

  if (services?.smtp) {
    mailer = parseSmtpEmailService();
    onServiceStartUp?.smtp?.();
  }

  return {
    datasource: datasource as DataSource,
    redisClient: redisClient as RedisClientType,
    mongoClient: mongoClient as mongoose.Mongoose,
    mailer: mailer as nodemailer.Transporter,
  };
}

function parseSmtpEmailService(): nodemailer.Transporter | null {
  const smtpEnvs = getEnvSmtpConnection();
  if (!smtpEnvs) {
    throw new Error('SMTP environment variables are not set');
  }

  try {
    return nodemailer.createTransport({
      host: smtpEnvs.host,
      port: smtpEnvs.port,
      secure: smtpEnvs.secure,
      auth: {
        user: smtpEnvs.user,
        pass: smtpEnvs.pass,
      },
    });
  } catch (error) {
    throw new Error('SMTP connection failed, ' + String(error));
  }
}

async function parseMongoService(): Promise<mongoose.Mongoose | null> {
  const mongoUri = getEnvMongoConnection();
  if (!mongoUri) {
    throw new Error('Mongo environment variables are not set');
  }

  try {
    return await mongoose.connect(mongoUri);
  } catch (error) {
    throw new Error('Mongo connection failed, ' + String(error));
  }
}

async function parseRedisService() {
  const redisEnvs = getEnvDatabaseRedisConnection();
  if (!redisEnvs) {
    throw new Error('Redis environment variables are not set');
  }

  try {
    return await createClient({
      url: `redis://${redisEnvs.host}:${redisEnvs.port}`,
      password: redisEnvs.password,
    }).connect();
  } catch (error) {
    throw new Error('Redis connection failed, ' + String(error));
  }
}

async function parseSqlService(entities?: any[]): Promise<DataSource | null> {
  const sqlEnvs = getEnvDatabaseSqlConnection();
  if (!sqlEnvs) {
    throw new Error('SQL environment variables are not set');
  }

  try {
    const datasource = new DataSource({
      type: sqlEnvs.type,
      host: sqlEnvs.host,
      port: sqlEnvs.port,
      username: sqlEnvs.username,
      password: sqlEnvs.password,
      database: sqlEnvs.database,
      synchronize: sqlEnvs.synchronize || false,
      logging: sqlEnvs.logs || true,
      entities: entities || [],
    });

    await datasource.initialize();
    if (!datasource.isInitialized) {
      throw new Error('Error while connecting to sql datasource');
    }

    return datasource;
  } catch (error) {
    throw error;
  }
}
