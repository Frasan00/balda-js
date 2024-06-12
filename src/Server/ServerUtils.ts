import { DataSource, DataSourceOptions } from 'typeorm';
import ServerOptions from './ServerTypes';
import { createClient, RedisClientOptions, RedisClientType } from 'redis';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Mailer from '../Mailer/Mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export type ServicesType = {
  datasource: DataSource;
  redisClient: RedisClientType<any>;
  mongoClient: mongoose.Mongoose;
  mailer: Mailer;
};

export async function parseServices(
  services?: ServerOptions['services'],
  onServiceStartUp?: ServerOptions['onServiceStartUp']
): Promise<ServicesType> {
  let datasource: DataSource | null = null;
  let redisClient: RedisClientType<any> | null = null;
  let mongoClient: mongoose.Mongoose | null = null;
  let mailer: Mailer | null = null;

  if (services?.sql) {
    datasource = await parseSqlService(services.sql);
    onServiceStartUp?.sql?.();
  }

  if (services?.redis) {
    redisClient = (await parseRedisService(services.redis)) as RedisClientType<any>;
    onServiceStartUp?.redis?.();
  }

  if (services?.mongo) {
    mongoClient = await parseMongoService(services.mongo);
    onServiceStartUp?.mongo?.();
  }

  if (services?.smtp) {
    const nodemailer = await parseSmtpEmailService(services.smtp);
    mailer = new Mailer(nodemailer);
    onServiceStartUp?.smtp?.();
  }

  return {
    datasource: datasource as DataSource,
    redisClient: redisClient as RedisClientType<any>,
    mongoClient: mongoClient as mongoose.Mongoose,
    mailer: mailer as Mailer,
  };
}

async function parseSmtpEmailService(
  smtpOptions: string | SMTPTransport | SMTPTransport.Options
): Promise<nodemailer.Transporter> {
  try {
    return await new Promise<nodemailer.Transporter>((resolve, reject) => {
      const transporter = nodemailer.createTransport(smtpOptions);

      transporter.verify((error) => {
        if (error) {
          return reject(error);
        }

        resolve(transporter);
      });
    });
  } catch (error) {
    throw new Error('SMTP connection failed, ' + String(error));
  }
}

async function parseMongoService(
  mongoOptions: mongoose.ConnectOptions & { url: string }
): Promise<mongoose.Mongoose> {
  const url = mongoOptions.url;
  delete (mongoOptions as mongoose.ConnectOptions & { url?: string }).url;
  try {
    return await mongoose.connect(url, mongoOptions);
  } catch (error) {
    throw new Error('Mongo connection failed, ' + String(error));
  }
}

async function parseRedisService(redisOptions: RedisClientOptions) {
  try {
    return await createClient({
      ...redisOptions,
    })?.connect();
  } catch (error) {
    throw new Error('Redis connection failed, ' + String(error));
  }
}

async function parseSqlService(sqlOptions: DataSourceOptions): Promise<DataSource> {
  try {
    const datasource: DataSource = new DataSource({
      ...sqlOptions,
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
