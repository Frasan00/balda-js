import express from './Customization';
import { ParamsDictionary } from 'express-serve-static-core';
import QueryString from 'qs';
import ServerOptions from './ServerTypes';
import cors from 'cors';
import env from 'envitron';
import nodemailer from 'nodemailer';
import typeorm, { DataSource } from 'typeorm';
import mongoose from 'mongoose';
import redis from 'redis';
import { ServicesType, parseServices } from './ServerUtils';
import { CRUDType, IndexType } from '../CRUD/CrudTypes';
import { CrudTypeEnum, makeBaseCruds } from '../CRUD/Crud';
import { EditIndexType } from '../CRUD/EditCrudTypes';

export default class Server {
  protected app: express.Application;
  protected services: ServerOptions['services'];
  public middlewares: Record<
    string,
    (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>
  >;
  protected cruds: Map<new () => typeorm.BaseEntity, Record<string, CRUDType<typeorm.BaseEntity>>>;
  public port: number;
  public host: string;
  public mailer: nodemailer.Transporter;
  public sql: DataSource;
  public redisClient: redis.RedisClientType;
  public mongoClient: mongoose.Mongoose;

  public static async create(serverOptions?: ServerOptions): Promise<Server> {
    const services = await parseServices(
      serverOptions?.services,
      serverOptions?.onServiceStartUp,
      serverOptions?.entities
    );
    const server = new Server(
      {
        datasource: services.datasource,
        redisClient: services.redisClient,
        mongoClient: services.mongoClient,
        mailer: services.mailer,
      },
      serverOptions || {}
    );

    return server;
  }

  private constructor(services: ServicesType, serverOptions?: ServerOptions) {
    this.app = serverOptions?.expressInstance || express();
    this.port = serverOptions?.port || (env.getEnv('PORT', 80) as number);
    this.host = serverOptions?.host || (env.getEnv('HOST', '0.0.0.0') as string);
    this.cruds = new Map();
    this.services = {
      sql: serverOptions?.services?.sql ?? false,
      redis: serverOptions?.services?.redis ?? false,
      mongo: serverOptions?.services?.mongo ?? false,
      smtp: serverOptions?.services?.smtp ?? false,
      auth: serverOptions?.services?.auth ?? false,
    };

    this.mailer = services.mailer;
    this.sql = services.datasource;
    this.redisClient = services.redisClient;
    this.mongoClient = services.mongoClient;
  }

  public start(cb?: () => void) {
    this.app.listen(this.port, this.host, cb);
  }

  /**
   * @description - The handler will be executed before every request
   * @param handler
   * @returns
   */
  public async registerGlobalMiddleware(
    handler: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => Promise<void>
  ): Promise<void> {
    this.app.use(handler);
  }

  /**
   * @description - The handler to register as a middleware that can be used in CRUD operations, if name is not provided, function name will be used instead
   * @param handler
   * @param name
   * @returns
   */
  public async registerMiddleware(
    handler: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => Promise<void>,
    name?: string
  ): Promise<void> {
    if (name && this.middlewares[name]) {
      throw new Error(`Middleware with name ${name} already exists`);
    }

    if (name) {
      this.middlewares[name] = handler;
      return;
    }

    if (this.middlewares[handler.name]) {
      throw new Error(`Middleware with name ${handler.name} already exists`);
    }

    this.middlewares[handler.name] = handler;
  }

  /**
   * @description - Creates basic CRUD operations for a given entity
   * @description - The entity must be a typeorm EntitySchema
   * @description - Creates an index, show, create, update, and delete operation
   * @param entity - The entity to create CRUD operations for
   */
  public makeCRUD<T extends typeorm.BaseEntity>(entity: new () => T): void {
    let entityName = entity.name.toLowerCase();
    entityName = entityName.endsWith('s') ? entityName : `${entityName}s`;

    const cruds = makeBaseCruds<typeorm.BaseEntity>(entityName);
    this.cruds.set(entity, cruds);
    this.registerCRUDRoutes<typeorm.BaseEntity>(cruds, entity);
  }

  /**
   * @description - Customize the index CRUD operations for a given entity with custom hooks
   * @param type @description Hook to customize the base CRUD operations
   */
  public customizeIndexCRUD<T extends typeorm.BaseEntity>(
    entity: new () => T,
    editIndexCrud: EditIndexType<T>
  ) {
    const baseCrud = this.cruds.get(entity);
    if (!baseCrud) {
      throw new Error(
        `CRUD operations for entity ${entity.name} not found, are you sure you created them with server.makeCRUD?`
      );
    }

    const indexCrud = baseCrud['indexCrud'] as IndexType<typeorm.BaseEntity>;
    this.cruds.set(entity, {
      ...baseCrud,
      indexCrud: {
        ...indexCrud,
        beforeFetch: editIndexCrud.beforeFetch || indexCrud.beforeFetch,
        duringFetch: editIndexCrud.duringFetch || indexCrud.duringFetch,
        afterFetch: editIndexCrud.afterFetch || indexCrud.afterFetch,
        middlewares: editIndexCrud.middlewares?.length
          ? editIndexCrud.middlewares
          : indexCrud.middlewares,
      } as IndexType<typeorm.BaseEntity>,
    });

    this.updateCRUDRoutes<typeorm.BaseEntity>(
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  public use(
    ...handlers: express.RequestHandler<
      ParamsDictionary,
      any,
      any,
      QueryString.ParsedQs,
      Record<string, any>
    >[]
  ) {
    this.app.use(...handlers);
  }

  public useCors(corsOptions?: cors.CorsOptions) {
    this.app.use(cors(corsOptions));
  }

  protected registerCRUDRoutes<T extends typeorm.BaseEntity>(
    cruds: Record<string, CRUDType<T>>,
    entity: new () => typeorm.BaseEntity
  ): void {
    for (const [key, crud] of Object.entries(cruds)) {
      const middlewares =
        crud.middlewares?.map((middleware) => {
          if (!this.middlewares[middleware]) {
            throw new Error(`Middleware ${middleware} not found in the server`);
          }

          return this.middlewares[middleware];
        }) ?? [];

      switch (key) {
        case CrudTypeEnum.indexCrud:
          const indexCrud = crud as IndexType<T>;
          this.app.get(
            indexCrud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response) => {
              const beforeFetchData = await indexCrud.beforeFetch(req);
              const data = await indexCrud.duringFetch(
                req,
                () => this.sql.getRepository(entity as new () => T).createQueryBuilder(),
                beforeFetchData,
                res
              );
              await indexCrud.afterFetch(req, data, res);
            }
          );
          break;
      }
    }
  }

  protected updateCRUDRoutes<T extends typeorm.BaseEntity>(
    cruds: Record<string, CRUDType<T>>,
    entity: new () => typeorm.BaseEntity
  ): void {
    for (const [key, crud] of Object.entries(cruds)) {
      const middlewares =
        crud.middlewares?.map((middleware) => {
          if (!Object.keys(this.middlewares || {}).includes(middleware)) {
            throw new Error(`Middleware ${middleware} not found in the server`);
          }

          return this.middlewares[middleware];
        }) ?? [];

      switch (key) {
        case CrudTypeEnum.indexCrud:
          const indexCrud = crud as IndexType<T>;

          this.app._router.stack = this.app._router.stack.filter(
            (layer: any) =>
              layer.route?.path !== indexCrud.path || layer.route?.methods.get !== true
          );

          this.app.get(
            indexCrud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response) => {
              const beforeFetchData = await indexCrud.beforeFetch(req);
              const data = await indexCrud.duringFetch(
                req,
                () => this.sql.getRepository(entity as new () => T).createQueryBuilder(),
                beforeFetchData,
                res
              );
              await indexCrud.afterFetch(req, data, res);
            }
          );
          break;
      }
    }
  }
}
