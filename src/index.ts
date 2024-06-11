import Logger from '../Logger';
import Server from './Server/Server';
import * as typeorm from 'typeorm';
import 'reflect-metadata';

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
      sql: true,
      redis: true,
    },
    entities: [User],
    onServiceStartUp: {
      sql: async () => {
        Logger.info('SQL Connected');
      },
      redis: async () => {
        Logger.info('Redis Connected');
      },
    },
  });

  server.registerGlobalMiddleware(async (req, res, next) => {
    console.log('Daje');
    next();
  });

  server.makeCRUD(User);
  server.customizeIndexCRUD(User, {
    beforeFetch: async (_req) => {
      console.log('ROMA MIA ROMA BELLA DAJEEEEEE');
    },
    afterFetch: async (_req, _data, res) => {
      res.internalServerError('Qualcosa è andato storto');
    },
  });

  server.start(() => Logger.info('Server started on port ' + server.port));
})();

export default {
  Logger,
};
