import Logger from '../Logger';
import Server from './Server/Server';
import * as typeorm from 'typeorm';
import 'reflect-metadata';
import dotenv from 'dotenv';
import express from './Server/Customization';
dotenv.config();

const type = (process.env.DB_TYPE as 'mysql' | 'mariadb') || 'postgres';
const host = process.env.DB_HOST as string;
const port = Number(process.env.DB_PORT);
const username = process.env.DB_USERNAME as string;
const password = process.env.DB_PASSWORD as string;
const database = process.env.DB_DATABASE as string;

@typeorm.Entity()
class User extends typeorm.BaseEntity {
  @typeorm.PrimaryGeneratedColumn()
  id: number;

  @typeorm.Column({ type: 'varchar' })
  name: string;
}

(async () => {
  const server = await Server.create({
    port: 80,
    host: '0.0.0.0',
    services: {
      sql: {
        type,
        host,
        port,
        username,
        password,
        database,
        entities: [User],
        logging: true,
        synchronize: true,
      },
      redis: {
        url: process.env.REDIS_URL as string,
        password: process.env.REDIS_PASSWORD as string,
      },
      // smtp: {
      //   host: process.env.SMTP_HOST as string,
      //   port: Number(process.env.SMTP_PORT),
      //   auth: {
      //     user: process.env.SMTP_USER as string,
      //     pass: process.env.SMTP_PASSWORD as string,
      //   },
      //   from: process.env.SMTP_FROM as string,
      // },
      mongo: {
        url: process.env.MONGO_URL as string,
      },
    },
    onServiceStartUp: {
      sql: async () => {
        Logger.info('SQL Connected');
      },
      redis: async () => {
        Logger.info('Redis Connected');
      },
      mongo: async () => {
        Logger.info('Mongo Connected');
      },
      smtp: async () => {
        Logger.info('SMTP Connected');
      },
    },
  });

  server.registerGlobalMiddleware(async (req, res, next) => {
    console.log('Global middleware');

    req.user = await server.sql.getRepository(User).findOneByOrFail({ id: 1 });
    next();
  });

  server.registerMiddleware({
    name: 'log',
    handler: (_req, _res, next: express.NextFunction) => {
      console.log('Middleware log, fine until now');
      next();
    },
  });

  server.makeCRUD(User);
  server.customizeIndexCRUD(User, {
    afterFetch: async (req, data, res) => {
      const user = req.getUser<User>();
      res.ok('User retrieved, ' + JSON.stringify(user));
    },
    middlewares: ['log'],
  });

  server.start(() => Logger.info('Server started on port ' + server.port));

  Server.cron('* * * * * *', () => {
    Logger.info('Cron job');
  });
})();

export default {
  Logger,
  Server,
  createServer: Server.create,
};
