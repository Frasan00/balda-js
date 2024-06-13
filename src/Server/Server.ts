import express from './Customization';
import { ParamsDictionary } from 'express-serve-static-core';
import QueryString from 'qs';
import ServerOptions from './ServerTypes';
import cors from 'cors';
import typeorm, { DataSource } from 'typeorm';
import mongoose from 'mongoose';
import redis from 'redis';
import { ServicesType, errorMiddleware, parseServices } from './ServerUtils';
import {
  CRUDType,
  DeleteType,
  IndexType,
  ShowType,
  StoreType,
  UpdateType,
} from '../CRUD/CrudTypes';
import { CrudTypeEnum, makeBaseCruds } from '../CRUD/Crud';
import {
  EditDeleteType,
  EditIndexType,
  EditShowType,
  EditStoreType,
  EditUpdateType,
} from '../CRUD/EditCrudTypes';
import Mailer from '../Mailer/Mailer';

export default class Server {
  protected app: express.Application;
  protected services: ServerOptions['services'];
  protected middlewares: Record<string, express.RequestHandler>;
  protected cruds: Map<new () => typeorm.BaseEntity, Record<string, CRUDType<typeorm.BaseEntity>>>;
  public port: number;
  public host: string;
  public mailer: Mailer;
  public sql: DataSource;
  public redisClient: redis.RedisClientType;
  public mongoClient: mongoose.Mongoose;

  private constructor(services: ServicesType, serverOptions: ServerOptions) {
    this.app = serverOptions?.expressInstance || express();
    this.app.use(errorMiddleware);

    this.port = serverOptions.port;
    this.host = serverOptions.host;
    this.cruds = new Map();
    this.services = {
      sql: serverOptions?.services?.sql,
      redis: serverOptions?.services?.redis,
      mongo: serverOptions?.services?.mongo,
      smtp: serverOptions?.services?.smtp,
      auth: serverOptions?.services?.auth,
    };

    this.mailer = services.mailer;
    this.sql = services.datasource;
    this.redisClient = services.redisClient as redis.RedisClientType;
    this.mongoClient = services.mongoClient;
    this.middlewares = {};
  }

  public static async create(serverOptions?: ServerOptions): Promise<Server> {
    const services = await parseServices(serverOptions?.services, serverOptions?.onServiceStartUp);
    const server = new Server(
      {
        datasource: services.datasource,
        redisClient: services.redisClient,
        mongoClient: services.mongoClient,
        mailer: services.mailer,
      },
      serverOptions || { port: 80, host: '0.0.0.0' }
    );

    return server;
  }

  protected static parseCronExpression(cronExpression: string) {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');

    return {
      minute: minute === '*' ? null : parseInt(minute, 10),
      hour: hour === '*' ? null : parseInt(hour, 10),
      dayOfMonth: dayOfMonth === '*' ? null : parseInt(dayOfMonth, 10),
      month: month === '*' ? null : parseInt(month, 10),
      dayOfWeek: dayOfWeek === '*' ? null : parseInt(dayOfWeek, 10),
    };
  }

  /**
   * @description - Creates a cron job that is checked every minute if can be executed
   * @param cronExpression
   * @param target
   * @returns
   */
  public static cron(cronExpression: string, target: () => any) {
    const { minute, hour, dayOfMonth, month, dayOfWeek } =
      Server.parseCronExpression(cronExpression);

    return setInterval(() => {
      const date = new Date();
      if (
        (minute === null || minute === date.getMinutes()) &&
        (hour === null || hour === date.getHours()) &&
        (dayOfMonth === null || dayOfMonth === date.getDate()) &&
        (month === null || month === date.getMonth()) &&
        (dayOfWeek === null || dayOfWeek === date.getDay())
      ) {
        target();
      }
    }, 60000);
  }

  public start(cb?: () => void) {
    this.app.listen(this.port, this.host, cb);
  }

  /**
   * @description - The handler will be executed before every request
   * @param handler
   * @returns
   */
  public async registerGlobalMiddleware(handler: express.RequestHandler): Promise<void> {
    this.app.use(handler);
  }

  /**
   * @description - The handler to register as a middleware that can be used in CRUD operations, if name is not provided, function name will be used instead
   * @param handler
   * @param name
   * @returns
   */
  public async registerMiddleware(handlerData: {
    handler: express.RequestHandler;
    name?: string;
  }): Promise<void> {
    console.log(this.middlewares);

    if (handlerData.name && this.middlewares.hasOwnProperty(handlerData.name)) {
      throw new Error(`Middleware with name ${handlerData.name} already exists`);
    }

    if (handlerData.name) {
      this.middlewares[handlerData.name] = handlerData.handler;
      return;
    }

    if (this.middlewares[handlerData.handler.name]) {
      throw new Error(`Middleware with name ${handlerData.handler.name} already exists`);
    }

    this.middlewares[handlerData.handler.name] = handlerData.handler;
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
   * @description - Customize the index CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
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

  /**
   * @description - Customize the show CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public customizeShowCRUD<T extends typeorm.BaseEntity>(
    entity: new () => T,
    editShowCrud: EditShowType<T>
  ) {
    const baseCrud = this.cruds.get(entity);
    if (!baseCrud) {
      throw new Error(
        `CRUD operations for entity ${entity.name} not found, are you sure you created them with server.makeCRUD?`
      );
    }

    const showCrud = baseCrud['showCrud'] as ShowType<typeorm.BaseEntity>;
    this.cruds.set(entity, {
      ...baseCrud,
      showCrud: {
        ...showCrud,
        beforeFetch: editShowCrud.beforeFetch || showCrud.beforeFetch,
        duringFetch: editShowCrud.duringFetch || showCrud.duringFetch,
        afterFetch: editShowCrud.afterFetch || showCrud.afterFetch,
        middlewares: editShowCrud.middlewares?.length
          ? editShowCrud.middlewares
          : showCrud.middlewares,
      } as ShowType<typeorm.BaseEntity>,
    });

    this.updateCRUDRoutes<typeorm.BaseEntity>(
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the store CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public customizeStoreCRUD<T extends typeorm.BaseEntity>(
    entity: new () => T,
    editStoreCrud: EditStoreType<T>
  ) {
    const baseCrud = this.cruds.get(entity);
    if (!baseCrud) {
      throw new Error(
        `CRUD operations for entity ${entity.name} not found, are you sure you created them with server.makeCRUD?`
      );
    }

    const storeCrud = baseCrud['storeCrud'] as StoreType<typeorm.BaseEntity>;
    this.cruds.set(entity, {
      ...baseCrud,
      storeCrud: {
        ...storeCrud,
        beforeFetch: editStoreCrud.beforeCreate || storeCrud.beforeCreate,
        duringFetch: editStoreCrud.duringCreate || storeCrud.duringCreate,
        afterFetch: editStoreCrud.afterCreate || storeCrud.afterCreate,
        middlewares: editStoreCrud.middlewares?.length
          ? editStoreCrud.middlewares
          : storeCrud.middlewares,
      } as StoreType<typeorm.BaseEntity>,
    });

    this.updateCRUDRoutes<typeorm.BaseEntity>(
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the update CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public customizeUpdateCRUD<T extends typeorm.BaseEntity>(
    entity: new () => T,
    editUpdateCrud: EditUpdateType<T>
  ) {
    const baseCrud = this.cruds.get(entity);
    if (!baseCrud) {
      throw new Error(
        `CRUD operations for entity ${entity.name} not found, are you sure you created them with server.makeCRUD?`
      );
    }

    const updateCrud = baseCrud['updateCrud'] as UpdateType<typeorm.BaseEntity>;
    this.cruds.set(entity, {
      ...baseCrud,
      updateCrud: {
        ...updateCrud,
        beforeFetch: editUpdateCrud.beforeUpdate || updateCrud.beforeUpdate,
        duringFetch: editUpdateCrud.duringUpdate || updateCrud.duringUpdate,
        afterFetch: editUpdateCrud.afterUpdate || updateCrud.afterUpdate,
        middlewares: editUpdateCrud.middlewares?.length
          ? editUpdateCrud.middlewares
          : updateCrud.middlewares,
      } as UpdateType<typeorm.BaseEntity>,
    });

    this.updateCRUDRoutes<typeorm.BaseEntity>(
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the delete CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public customizeDeleteCRUD<T extends typeorm.BaseEntity>(
    entity: new () => T,
    editDeleteCrud: EditDeleteType<T>
  ) {
    const baseCrud = this.cruds.get(entity);
    if (!baseCrud) {
      throw new Error(
        `CRUD operations for entity ${entity.name} not found, are you sure you created them with server.makeCRUD?`
      );
    }

    const deleteCrud = baseCrud['deleteCrud'] as DeleteType<typeorm.BaseEntity>;
    this.cruds.set(entity, {
      ...baseCrud,
      deleteCrud: {
        ...deleteCrud,
        beforeFetch: editDeleteCrud.beforeDelete || deleteCrud.beforeDelete,
        duringFetch: editDeleteCrud.duringDelete || deleteCrud.duringDelete,
        afterFetch: editDeleteCrud.afterDelete || deleteCrud.afterDelete,
        middlewares: editDeleteCrud.middlewares?.length
          ? editDeleteCrud.middlewares
          : deleteCrud.middlewares,
      } as DeleteType<typeorm.BaseEntity>,
    });

    this.updateCRUDRoutes<typeorm.BaseEntity>(
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  public rawExpressApp() {
    return this.app;
  }

  public router(): express.Router {
    return express.Router();
  }

  public use(
    ...handlers: express.RequestHandler<
      ParamsDictionary,
      any,
      any,
      QueryString.ParsedQs,
      Record<string, any>
    >[]
  ): express.Application {
    return this.app.use(...handlers);
  }

  public useCors(corsOptions?: cors.CorsOptions): express.Application {
    return this.app.use(cors(corsOptions));
  }

  protected registerCRUDRoutes<T extends typeorm.BaseEntity>(
    cruds: Record<string, CRUDType<T>>,
    entity: new () => typeorm.BaseEntity
  ): void {
    for (const [key, crud] of Object.entries(cruds)) {
      const middlewares = this.parseMiddlewares(crud.middlewares);

      switch (key) {
        case CrudTypeEnum.indexCrud:
          const indexCrud = crud as IndexType<T>;
          this.app.get(
            indexCrud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeFetchData = await indexCrud.beforeFetch(req);
                const data = await indexCrud.duringFetch(
                  req,
                  () => this.sql.getRepository(entity as new () => T).createQueryBuilder(),
                  beforeFetchData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await indexCrud.afterFetch(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.showCrud:
          const showCrud = crud as ShowType<T>;
          this.app.get(
            showCrud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeFetchData = await showCrud.beforeFetch(req);
                const data = await showCrud.duringFetch(
                  req,
                  () => this.sql.getRepository(entity as new () => T).createQueryBuilder(),
                  beforeFetchData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await showCrud.afterFetch(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.storeCrud:
          const postCrud = crud as StoreType<T>;
          this.app.post(
            crud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeCreateData = await postCrud.beforeCreate(req);
                const data = await postCrud.duringCreate(
                  req,
                  () => this.sql.getRepository(entity as new () => T),
                  beforeCreateData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await postCrud.afterCreate(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.updateCrud:
          const updateCrud = crud as UpdateType<T>;
          this.app.patch(
            crud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeUpdateData = await updateCrud.beforeUpdate(req);
                const data = await updateCrud.duringUpdate(
                  req,
                  () => this.sql.getRepository(entity as new () => T),
                  beforeUpdateData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await updateCrud.afterUpdate(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.deleteCrud:
          const deleteCrud = crud as UpdateType<T>;
          this.app.delete(
            crud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeDeleteData = await deleteCrud.beforeUpdate(req);
                const data = await deleteCrud.duringUpdate(
                  req,
                  () => this.sql.getRepository(entity as new () => T),
                  beforeDeleteData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        default:
          break;
      }
    }
  }

  protected updateCRUDRoutes<T extends typeorm.BaseEntity>(
    cruds: Record<string, CRUDType<T>>,
    entity: new () => typeorm.BaseEntity
  ): void {
    for (const [key, crud] of Object.entries(cruds)) {
      const middlewares = this.parseMiddlewares(crud.middlewares);

      switch (key) {
        case CrudTypeEnum.indexCrud:
          const indexCrud = crud as IndexType<T>;
          const newStack = this.removeRouteByMethodAndPath(this.app, 'GET', indexCrud.path);
          if (newStack) {
            this.app._router.stack = newStack;
          }

          this.app.get(
            indexCrud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeFetchData = await indexCrud.beforeFetch(req);
                const data = await indexCrud.duringFetch(
                  req,
                  () => this.sql.getRepository(entity as new () => T).createQueryBuilder(),
                  beforeFetchData,
                  res
                );
                await indexCrud.afterFetch(req, data, res);
              } catch (error) {
                return next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.showCrud:
          const showCrud = crud as ShowType<T>;
          const newStackShow = this.removeRouteByMethodAndPath(this.app, 'GET', showCrud.path);
          if (newStackShow) {
            this.app._router.stack = newStackShow;
          }

          this.app.get(
            showCrud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeFetchData = await showCrud.beforeFetch(req);
                const data = await showCrud.duringFetch(
                  req,
                  () => this.sql.getRepository(entity as new () => T).createQueryBuilder(),
                  beforeFetchData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await showCrud.afterFetch(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.storeCrud:
          const postCrud = crud as StoreType<T>;
          const newStackStore = this.removeRouteByMethodAndPath(this.app, 'POST', postCrud.path);
          if (newStackStore) {
            this.app._router.stack = newStackStore;
          }

          this.app.post(
            crud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeCreateData = await postCrud.beforeCreate(req);
                const data = await postCrud.duringCreate(
                  req,
                  () => this.sql.getRepository(entity as new () => T),
                  beforeCreateData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await postCrud.afterCreate(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.updateCrud:
          const updateCrud = crud as UpdateType<T>;
          const newStackUpdate = this.removeRouteByMethodAndPath(
            this.app,
            'PATCH',
            updateCrud.path
          );
          if (newStackUpdate) {
            this.app._router.stack = newStackUpdate;
          }

          this.app.patch(
            crud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeUpdateData = await updateCrud.beforeUpdate(req);
                const data = await updateCrud.duringUpdate(
                  req,
                  () => this.sql.getRepository(entity as new () => T),
                  beforeUpdateData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
                await updateCrud.afterUpdate(req, data, res);
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        case CrudTypeEnum.deleteCrud:
          const deleteCrud = crud as UpdateType<T>;
          const newStackDelete = this.removeRouteByMethodAndPath(
            this.app,
            'DELETE',
            deleteCrud.path
          );
          if (newStackDelete) {
            this.app._router.stack = newStackDelete;
          }

          this.app.delete(
            crud.path,
            [...middlewares],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              try {
                const beforeDeleteData = await deleteCrud.beforeUpdate(req);
                const data = await deleteCrud.duringUpdate(
                  req,
                  () => this.sql.getRepository(entity as new () => T),
                  beforeDeleteData,
                  res
                );
                if (!data) {
                  return next(new Error('Data is void'));
                }
              } catch (error) {
                next(error);
              }
            }
          );
          break;

        default:
          break;
      }
    }
  }

  protected parseMiddlewares(middlewares: string[]): express.RequestHandler[] {
    return (
      middlewares.map((middleware: string) => {
        if (!Object.keys(this.middlewares || {}).includes(middleware)) {
          throw new Error(`Middleware ${middleware} not found in the server`);
        }

        return this.middlewares[middleware];
      }) ?? []
    );
  }

  protected removeRouteByMethodAndPath(
    app: express.Application,
    method: string,
    path: string
  ): any[] {
    return app._router.stack.filter(
      (layer: any) =>
        !(layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()])
    );
  }
}
