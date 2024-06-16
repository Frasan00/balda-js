import express from './Customization';
import { ParamsDictionary } from 'express-serve-static-core';
import QueryString from 'qs';
import ServerOptions from './ServerTypes';
import cors from 'cors';
import typeorm, { DataSource } from 'typeorm';
import mongoose from 'mongoose';
import redis from 'redis';
import Router from '../Router/Router';
import { ServicesType, errorMiddleware, parseServices } from './ServerUtils';
import {
  CRUDType,
  DeleteType,
  IndexType,
  ShowType,
  StoreType,
  UpdateType,
} from '../CRUD/CrudTypes';
import { makeBaseCruds } from '../CRUD/Crud';
import {
  EditDeleteType,
  EditIndexType,
  EditShowType,
  EditStoreType,
  EditUpdateType,
} from '../CRUD/EditCrudTypes';
import Mailer from '../Mailer/Mailer';
import { registerOrUpdateCRUDRoutes } from '../CRUD/CrudUtils';
import expressOasGenerator, { SPEC_OUTPUT_FILE_BEHAVIOR } from 'express-oas-generator';
import AuthService from '../Auth/auth';
import bodyParser from 'body-parser';
import Logger from '../../Logger';

export default class Server {
  protected services: ServerOptions['services'];
  protected cruds: Map<new () => typeorm.BaseEntity, Record<string, CRUDType<typeorm.BaseEntity>>>;
  public middlewares: Record<string, express.RequestHandler>;
  public app: express.Application;
  public port: number;
  public host: string;
  public mailer: Mailer;
  public sql: DataSource;
  public redisClient: redis.RedisClientType;
  public mongoClient: mongoose.Mongoose;
  public auth: AuthService;

  private constructor(services: ServicesType, serverOptions: ServerOptions) {
    this.app = serverOptions?.expressInstance || express();
    Router.setServer(this);
    if (!!serverOptions?.services?.swagger) {
      expressOasGenerator.init(this.app as express.Express, {
        schemes: ['http'],
        responses: {
          200: {
            description: 'Success',
          },
          400: {
            description: 'Bad request',
          },
          401: {
            description: 'Unauthorized',
          },
          403: {
            description: 'Forbidden',
          },
          404: {
            description: 'Not found',
          },
          500: {
            description: 'Internal server error',
          },
        },
        info: {
          license: {
            name: serverOptions.services.swagger.licence?.name || 'MIT',
            url:
              serverOptions.services.swagger.licence?.url || 'https://opensource.org/licenses/MIT',
          },
          title: serverOptions.services.swagger.title || 'API Documentation',
          version: serverOptions.services.swagger.version || '1.0.0',
          description:
            serverOptions.services.swagger.description ||
            'Auto-generated API documentation using express-oas-generator',
        },
        // basePath: serverOptions.services.swagger.customSwaggerDefinitionPath,
        specOutputFileBehavior: SPEC_OUTPUT_FILE_BEHAVIOR.PRESERVE,
        securityDefinitions: {
          Bearer: {
            type: 'token',
            name: 'Authorization',
            in: 'header',
          },
        },
      });
    }

    // base middlewares
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.raw());
    this.app.use(bodyParser.text());

    this.port = serverOptions.port;
    this.host = serverOptions.host;
    this.cruds = new Map<
      new () => typeorm.BaseEntity,
      Record<string, CRUDType<typeorm.BaseEntity>>
    >();
    this.middlewares = {};
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
    this.auth = services.auth;

    if (this.auth) {
      this.registerAuthRoutes.bind(this)();
      this.registerMiddleware({
        handler: this.authMiddleware.bind(this),
        name: 'auth',
      });
    }
  }

  /**
   * @description - Creates a new server instance, main entry point for the framework
   * @param serverOptions - The options to create the server, default port is 80 and host is '0.0.0.0'
   * @returns
   */
  public static async create(
    serverOptions: ServerOptions = { port: 80, host: '0.0.0.0' }
  ): Promise<Server> {
    const services = await parseServices(serverOptions?.services, serverOptions?.onServiceStartUp);
    const server = new Server(
      {
        datasource: services.datasource,
        redisClient: services.redisClient,
        mongoClient: services.mongoClient,
        mailer: services.mailer,
        auth: services.auth,
      },
      serverOptions
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
   * @param cronExpression - The cron expression to check if the target should be executed
   * @param target - The function to execute if the cron expression is true
   * @param checkInterval - The interval to check if the cron expression is true
   * @returns
   */
  public static cron(cronExpression: string, target: () => any, checkInterval: number = 60000) {
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
    }, checkInterval);
  }

  /**
   * @description - Start the server
   * @description - If auth is enabled, it will register the auth routes and the 'auth' middleware
   * @param cb - Callback to execute after the server has started
   * @returns
   */
  public start(cb?: () => void) {
    this.app.use(errorMiddleware);
    this.app.listen(this.port, this.host, cb);
  }

  /**
   * @description - The handler will be executed before every request
   * @param handler
   * @returns
   */
  public async registerGlobalMiddleware(handler: express.RequestHandler): Promise<void> {
    const wrappedHandler: express.RequestHandler = async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };

    this.app.use(wrappedHandler);
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
    if (handlerData.name && this.middlewares.hasOwnProperty(handlerData.name)) {
      throw new Error(`Middleware with name ${handlerData.name} already exists`);
    }

    const wrappedHandler: express.RequestHandler = async (req, res, next) => {
      try {
        await handlerData.handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };

    if (handlerData.name) {
      this.middlewares[handlerData.name] = wrappedHandler;
      return;
    }

    if (this.middlewares[handlerData.handler.name]) {
      throw new Error(`Middleware with name ${handlerData.handler.name} already exists`);
    }

    this.middlewares[handlerData.handler.name] = wrappedHandler;
  }

  /**
   * @description - Creates basic CRUD operations for a given entity
   * @description - The entity must be a typeorm EntitySchema
   * @description - Creates an index, show, create, update, and delete operation
   * @param entity - The entity to create CRUD operations for
   */
  public makeCRUD<T extends typeorm.BaseEntity>(
    entity: new () => T,
    middlewares: string[] = [],
    apiVersion?: string
  ): void {
    let entityName = entity.name.toLowerCase();
    entityName = entityName.endsWith('s') ? entityName : `${entityName}s`;

    const cruds = makeBaseCruds<typeorm.BaseEntity>(entityName, middlewares, apiVersion);
    this.cruds.set(entity, cruds);
    registerOrUpdateCRUDRoutes<typeorm.BaseEntity>(this, cruds, entity);
  }

  /**
   * @description - Customize the index CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public seasonIndexCRUD<T extends typeorm.BaseEntity>(
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

    registerOrUpdateCRUDRoutes<typeorm.BaseEntity>(
      this,
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the show CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public seasonShowCRUD<T extends typeorm.BaseEntity>(
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

    registerOrUpdateCRUDRoutes<typeorm.BaseEntity>(
      this,
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the store CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public seasonStoreCRUD<T extends typeorm.BaseEntity>(
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

    registerOrUpdateCRUDRoutes<typeorm.BaseEntity>(
      this,
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the update CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public seasonUpdateCRUD<T extends typeorm.BaseEntity>(
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

    registerOrUpdateCRUDRoutes<typeorm.BaseEntity>(
      this,
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
  }

  /**
   * @description - Customize the delete CRUD operation for a given entity with custom hooks
   * @param type Hook to customize the base CRUD operations
   */
  public seasonDeleteCRUD<T extends typeorm.BaseEntity>(
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

    registerOrUpdateCRUDRoutes<typeorm.BaseEntity>(
      this,
      this.cruds.get(entity) as Record<string, CRUDType<typeorm.BaseEntity>>,
      entity
    );
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

  protected registerAuthRoutes() {
    Router.post('/auth/sign-up', async (req, res) => {
      const userData = req.body;

      const user = await this.auth.register(userData);
      return res.ok(user);
    });

    Router.post('/auth/refresh', async (req, res) => {
      if (!req.body.token) {
        return res.badRequest({
          error: 'Bad Request',
          message: 'Missing token field in request body',
        });
      }

      const refreshToken = req.body.token;
      try {
        const payload = this.auth.getRefreshTokenPayload(refreshToken) as {
          id: any;
          acccessTokenJti: string;
          exp: number;
        };
        if (!payload) {
          return res.unauthorized({
            message: 'Invalid refresh token',
          });
        }

        if (payload.exp && Date.now() >= payload.exp * 1000) {
          return res.forbidden({
            message: 'Refresh token expired',
          });
        }

        const associatedUser = (await this.auth.userRepository
          .createQueryBuilder(this.auth.userRepository.metadata.targetName)
          .where('id = :id', { id: payload.id })
          .getOne()) as (typeorm.BaseEntity & { id: any }) | null;
        if (!associatedUser) {
          return res.notFound({
            message: 'User not found',
          });
        }

        const jti = crypto.randomUUID();
        const accessToken = this.auth.generateAccessToken(associatedUser.id, jti);
        const newRefreshToken = this.auth.generateRefreshToken(associatedUser.id, jti);
        return res.send({ accessToken, newRefreshToken });
      } catch (error) {
        Logger.error(error);
        return res.unauthorized({
          message: String(error),
        });
      }
    });

    Router.post('/auth/sign-in', async (req, res) => {
      const { email, password } = req.body;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        return res.badRequest({ error: 'Email is required' });
      }

      if (!emailRegex.test(email)) {
        return res.badRequest({ error: 'Invalid email' });
      }

      if (!password) {
        return res.badRequest({ error: 'Password is required' });
      }

      const response = await this.auth.attemptLogin(email, password);
      if (
        typeof response === 'object' &&
        'status' in response &&
        response.status === 'failed' &&
        'code' in response
      ) {
        switch (response.code) {
          case 404:
            return res.notFound({ error: 'User not found' });
          case 401:
            return res.unauthorized({ error: 'Invalid credentials' });
          case 403:
            return res.forbidden({ error: 'User not verified' });
          case 404:
            return res.notFound({ error: 'User not found' });
          default:
            throw new Error('Unknown error');
        }
      }

      return res.ok(response);
    });
  }

  protected async authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.unauthorized({
        message: 'No token provided in Authorization header',
      });
    }

    try {
      const payload = this.auth.getAccessTokenPayload(token) as {
        id: any;
        jti: string;
        exp: number;
      };

      if (!payload) {
        return res.unauthorized({
          message: 'No payload found in token',
        });
      }

      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return res.forbidden({
          message: 'Token expired',
        });
      }

      req.user = this.auth.userRepository
        .createQueryBuilder(this.auth.userRepository.metadata.targetName)
        .where('id = :id', { id: payload.id })
        .getOne();
      if (!req.user) {
        return res.notFound({
          message: 'User not found',
        });
      }

      next();
    } catch (error) {
      Logger.error(error);
      return res.unauthorized({
        message: String(error),
      });
    }
  }
}
