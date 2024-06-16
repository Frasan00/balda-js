import Logger from '../Logger';
import Server from './Server/Server';
import * as typeorm from 'typeorm';
import 'reflect-metadata';
import express from './Server/Customization';
import Router from './Router/Router';
import dotenv from 'dotenv';
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

  @typeorm.Column({ type: 'boolean' })
  active: boolean;

  @typeorm.Column({ type: 'varchar' })
  email: string;

  @typeorm.Column({ type: 'varchar' })
  password: string;
}

(async () => {
  const server = await Server.create({
    port: 80,
    host: '0.0.0.0',
    services: {
      swagger: {
        title: 'My API',
        version: '1.0.0',
        description: 'My API description',
      },
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
      smtp: {
        host: process.env.SMTP_HOST as string,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER as string,
          pass: process.env.SMTP_PASSWORD as string,
        },
        from: process.env.SMTP_FROM as string,
      },
      mongo: {
        url: process.env.MONGO_URL as string,
      },
      auth: {
        accessTokenSecret: 'secret',
        refreshTokenSecret: 'secret',
        accessTokenExpiresIn: '1h',
        refreshTokenExpiresIn: '1d',
        UserModel: User,
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

  server.registerGlobalMiddleware(async (req, _res, next) => {
    console.log('Global middleware');
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
  server.seasonIndexCRUD(User, {
    afterFetch: async (req, _data, res) => {
      const user = req.getUser<User>();
      return res.ok('User retrieved, ' + JSON.stringify(user));
    },
    middlewares: ['log'],
  });

  Router.get(
    '/cool-path',
    (_req, res) => {
      res.ok('Cool path');
    },
    ['log', 'auth']
  );
  Router.group(
    (router) => {
      router.get(
        '/internal-cool-path',
        (_eq, res) => {
          res.ok('Internal cool path');
        },
        ['log']
      );
    },
    '/group',
    ['log']
  );

  server.start(() => Logger.info('Server started on port ' + server.port));

  Server.cron('* * * * * *', () => {
    Logger.info('Cron job');
  });
})();

export default {
  Logger,
  Server,
  createServer: Server.create,
  router: Router,
};
