import { DataSource, DataSourceOptions } from 'typeorm';
import ServerOptions, { SwaggerOptions } from './ServerTypes';
import { createClient, RedisClientOptions, RedisClientType } from 'redis';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Mailer from '../Mailer/Mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import express from './Customization';
import Logger from '../../Logger';
import swaggerAutogen from 'swagger-autogen';
import Server from './Server';

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

      transporter.on('idle', () => {
        Logger.info('SMTP idle');
      });

      transporter.on('error', (error) => {
        Logger.error('SMTP connection failed, ' + String(error) + ' - Closing connection');
        transporter.close();
      });

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
    const mongo = await mongoose.connect(url, mongoOptions);
    mongo.connection.on('disconnected', () => {
      Logger.info('Mongo disconnected');
    });

    mongo.connection.on('error', (error) => {
      Logger.error('Mongo connection failed, ' + String(error));
    });

    return mongo;
  } catch (error) {
    throw new Error('Mongo connection failed, ' + String(error));
  }
}

async function parseRedisService(redisOptions: RedisClientOptions) {
  try {
    const redisClient = await createClient({
      ...redisOptions,
    })?.connect();

    redisClient.on('error', (error) => {
      Logger.error('Redis connection failed, ' + String(error) + ' - Closing connection');
      redisClient.disconnect();
    });

    redisClient.on('disconnect', () => {
      Logger.info('Redis disconnected');
    });

    return redisClient;
  } catch (error) {
    throw new Error('Redis connection failed, ' + String(error));
  }
}

async function parseSqlService(sqlOptions: DataSourceOptions): Promise<DataSource> {
  try {
    const datasourceConf: DataSource = new DataSource({
      ...sqlOptions,
    });

    const datasource = await datasourceConf.initialize();
    if (!datasource.isInitialized) {
      throw new Error('Error while connecting to sql datasource');
    }

    return datasource;
  } catch (error) {
    throw error;
  }
}

export function errorMiddleware(
  error: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  Logger.error(error);
  return res.internalServerError({
    message: String(error),
  });
}

export function parseMiddlewares(server: Server, middlewares: string[]): express.RequestHandler[] {
  return (
    middlewares.map((middleware: string) => {
      if (!Object.keys(server.middlewares || {}).includes(middleware)) {
        throw new Error(`Middleware ${middleware} not found in the server`);
      }

      return server.middlewares[middleware];
    }) ?? []
  );
}

export function filterRouteByMethodAndPath(
  app: express.Application,
  method: string,
  path: string
): any[] {
  return app._router.stack.filter(
    (layer: any) =>
      !(layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()])
  );
}

// TODO: Implement the function generateSwagger
export function generateSwagger(app: express.Application, swaggerOptions: SwaggerOptions) {
  swaggerAutogen(app);
}
