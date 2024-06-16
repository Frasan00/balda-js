import * as QueryString from 'qs';
import QueryString__default from 'qs';
import * as express_serve_static_core from 'express-serve-static-core';
import { ParamsDictionary } from 'express-serve-static-core';
import express from 'express';
import * as typeorm from 'typeorm';
import typeorm__default, { DataSource } from 'typeorm';
import mongoose from 'mongoose';
import redis, { RedisClientOptions } from 'redis';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import cors from 'cors';
import * as nodemailer from 'nodemailer';
import stream from 'stream';
import Mail from 'nodemailer/lib/mailer';
import * as winston from 'winston';

type GenericUser = {
    [key: string]: any;
};
type Only<T, K extends keyof T> = {
    [P in K]: T[P];
};
declare global {
    namespace Express {
        interface Request {
            pickEntityValues: <T extends typeorm.BaseEntity, K extends keyof T>(entity: new () => T, keys: K[]) => Only<T, K>;
            user: GenericUser;
            getUser<T>(): T;
        }
        interface NextFunction {
        }
        interface Response {
            continue: () => void;
            switchProtocol: () => void;
            processing: () => void;
            earlyHints: () => void;
            ok: (body: any) => void;
            created: (body: any) => void;
            noContent: () => void;
            partialContent: (body: any) => void;
            multipleChoices: (body: any) => void;
            movedPermanently: (body: any) => void;
            seeOther: (body: any) => void;
            found: (body: any) => void;
            badRequest: (body: any) => void;
            unauthorized: (body: any) => void;
            forbidden: (body: any) => void;
            notFound: (body: any) => void;
            requestTimeout: (body: any) => void;
            conflict: (body: any) => void;
            unprocessableEntity: (body: any) => void;
            tooManyRequests: (body: any) => void;
            internalServerError: (body: any) => void;
            notImplemented: (body: any) => void;
            badGateway: (body: any) => void;
            serviceUnavailable: (body: any) => void;
        }
    }
}

/**
 * SwaggerOptions
 * @description Options for Swagger
 * @property {string} pathToSwaggerFile - Path to the swagger file optional, if not provided root path will be used
 * @property {string} resourcePath - Api resource path, if none provided /docs will be used
 */
type SwaggerOptions = {
    title?: string;
    version?: string;
    description?: string;
    licence?: {
        name: string;
        url: string;
    };
};
type AuthOptions = {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    UserModel: typeof typeorm.BaseEntity;
};
type ServerOptions = {
    port: number;
    host: string;
    expressInstance?: express.Application;
    services?: {
        sql?: typeorm.DataSourceOptions;
        redis?: RedisClientOptions;
        mongo?: mongoose.ConnectOptions & {
            url: string;
        };
        smtp?: string | SMTPTransport | SMTPTransport.Options;
        auth?: AuthOptions;
        swagger?: SwaggerOptions;
    };
    onServiceStartUp?: {
        sql?: () => void;
        redis?: () => void;
        mongo?: () => void;
        smtp?: () => void;
    };
};

type CRUDType<T extends typeorm.BaseEntity> = IndexType<T> | ShowType<T> | StoreType<T> | UpdateType<T> | DeleteType<T>;
type IndexType<T extends typeorm.BaseEntity> = {
    path: string;
    method: 'get';
    beforeFetch: (req: express.Request) => Promise<any>;
    duringFetch: (req: express.Request, selectQueryBuilder: () => typeorm.SelectQueryBuilder<T>, beforeFetchData: any, res: express.Response) => Promise<T[]>;
    afterFetch: (req: express.Request, duringFetchData: T[], res: express.Response) => Promise<void>;
    middlewares: string[];
};
type ShowType<T extends typeorm.BaseEntity> = {
    path: string;
    method: 'get';
    beforeFetch: (req: express.Request) => Promise<any>;
    duringFetch: (req: express.Request, selectQueryBuilder: () => typeorm.SelectQueryBuilder<T>, beforeFetchData: any, res: express.Response) => Promise<T>;
    afterFetch: (req: express.Request, duringFetchData: T, res: express.Response) => Promise<void>;
    middlewares: string[];
};
type StoreType<T extends typeorm.BaseEntity> = {
    path: string;
    method: 'post';
    beforeCreate: (req: express.Request) => Promise<any>;
    duringCreate: (req: express.Request, insertQueryBuilder: () => typeorm.Repository<T>, beforeCreateData: any, res: express.Response) => Promise<T>;
    afterCreate: (req: express.Request, duringCreateData: T, res: express.Response) => Promise<void>;
    middlewares: string[];
};
type UpdateType<T extends typeorm.BaseEntity> = {
    path: string;
    method: 'patch';
    beforeUpdate: (req: express.Request) => Promise<any>;
    duringUpdate: (req: express.Request, updateQueryBuilder: () => typeorm.Repository<T>, beforeUpdateData: any, res: express.Response) => Promise<T>;
    afterUpdate: (req: express.Request, duringUpdateData: T, res: express.Response) => Promise<void>;
    middlewares: string[];
};
type DeleteType<T extends typeorm.BaseEntity> = {
    path: string;
    method: 'delete';
    beforeDelete: (req: express.Request) => Promise<any>;
    duringDelete: (req: express.Request, deleteQueryBuilder: () => typeorm.Repository<T>, beforeDeleteData: any, res: express.Response) => Promise<T>;
    afterDelete: (req: express.Request, duringDeleteData: T, res: express.Response) => Promise<void>;
    middlewares: string[];
};

type EditIndexType<T extends typeorm.BaseEntity> = {
    beforeFetch?: (req: express.Request) => Promise<any>;
    duringFetch?: (req: express.Request, queryBuilder: () => typeorm.SelectQueryBuilder<T>, beforeFetchData: any, res: express.Response) => Promise<T[]>;
    afterFetch?: (req: express.Request, duringFetchData: T[], res: express.Response) => Promise<void>;
    middlewares?: string[];
};
type EditShowType<T extends typeorm.BaseEntity> = {
    beforeFetch?: (req: express.Request) => Promise<any>;
    duringFetch?: (req: express.Request, queryBuilder: typeorm.SelectQueryBuilder<T>, beforeFetchData: any, res: express.Response) => Promise<T>;
    afterFetch?: (req: express.Request, duringFetchData: T, res: express.Response) => Promise<void>;
    middlewares?: string[];
};
type EditStoreType<T extends typeorm.BaseEntity> = {
    beforeCreate?: (req: express.Request) => Promise<any>;
    duringCreate?: (req: express.Request, queryBuilder: typeorm.SelectQueryBuilder<T>, beforeCreateData: any, res: express.Response) => Promise<T> | Promise<T[]>;
    afterCreate?: (req: express.Request, duringCreateData: T | T[], res: express.Response) => Promise<void>;
    middlewares?: string[];
};
type EditUpdateType<T extends typeorm.BaseEntity> = {
    beforeUpdate?: (req: express.Request) => Promise<any>;
    duringUpdate?: (req: express.Request, queryBuilder: typeorm.SelectQueryBuilder<T>, beforeUpdateData: any, res: express.Response) => Promise<T> | Promise<T[]>;
    afterUpdate?: (req: express.Request, duringUpdateData: T | T[], res: express.Response) => Promise<void>;
    middlewares?: string[];
};
type EditDeleteType<T extends typeorm.BaseEntity> = {
    beforeDelete?: (req: express.Request) => Promise<any>;
    duringDelete?: (req: express.Request, queryBuilder: typeorm.SelectQueryBuilder<T>, beforeDeleteData: any, res: express.Response) => Promise<T> | Promise<T[]>;
    afterDelete?: (req: express.Request, duringDeleteData: T | T[], res: express.Response) => Promise<void>;
    middlewares?: string[];
};

declare class Mailer {
    private mailer;
    private fromEmail;
    constructor(nodemailer: nodemailer.Transporter);
    setGlobalFromEmail(email: string): void;
    sendMail(to: string, subject: string, text: string | Buffer | stream.Readable | Mail.AttachmentLike | undefined, failOnError?: boolean, from?: string): Promise<void>;
}

type AuthCodes = 400 | 401 | 403 | 404;
declare class AuthService {
    protected accessTokenSecret: string;
    protected refreshTokenSecret: string;
    protected accessTokenExpiresIn: string;
    protected refreshTokenExpiresIn: string;
    userRepository: typeorm.Repository<typeorm.BaseEntity>;
    constructor(authOptions: AuthOptions);
    /**
     * @description Registers a user and saves it to the database with a hashed password
     * @param user - TypeORM Entity for the user model, user must have a 'password' field and an 'email' field
     */
    register<T extends typeorm.BaseEntity>(user: T): Promise<T>;
    /**
     * @description Logs a user in and returns a JWT token
     * @param {string} email - The email of the user
     * @param {string} password - The password of the user
     * @returns {string} - The JWT tokens both access and refresh for the user
     * @returns {null} - If the user does not exist
     */
    attemptLogin(email: string, password: string): Promise<{
        status: string;
        accessToken: string;
        refreshToken: string;
    } | {
        status: string;
        code: AuthCodes;
    }>;
    getAccessTokenPayload(token: string): any;
    getRefreshTokenPayload(token: string): any;
    generateAccessToken(id: any, jti: string): string;
    generateRefreshToken(id: any, jti: string): string;
}

declare class Server {
    protected services: ServerOptions['services'];
    protected cruds: Map<new () => typeorm__default.BaseEntity, Record<string, CRUDType<typeorm__default.BaseEntity>>>;
    middlewares: Record<string, express.RequestHandler>;
    app: express.Application;
    port: number;
    host: string;
    mailer: Mailer;
    sql: DataSource;
    redisClient: redis.RedisClientType;
    mongoClient: mongoose.Mongoose;
    auth: AuthService;
    private constructor();
    /**
     * @description - Creates a new server instance, main entry point for the framework
     * @param serverOptions - The options to create the server, default port is 80 and host is '0.0.0.0'
     * @returns
     */
    static create(serverOptions?: ServerOptions): Promise<Server>;
    protected static parseCronExpression(cronExpression: string): {
        minute: number | null;
        hour: number | null;
        dayOfMonth: number | null;
        month: number | null;
        dayOfWeek: number | null;
    };
    /**
     * @description - Creates a cron job that is checked every minute if can be executed
     * @param cronExpression - The cron expression to check if the target should be executed
     * @param target - The function to execute if the cron expression is true
     * @param checkInterval - The interval to check if the cron expression is true
     * @returns
     */
    static cron(cronExpression: string, target: () => any, checkInterval?: number): NodeJS.Timeout;
    /**
     * @description - Start the server
     * @description - If auth is enabled, it will register the auth routes and the 'auth' middleware
     * @param cb - Callback to execute after the server has started
     * @returns
     */
    start(cb?: () => void): void;
    /**
     * @description - The handler will be executed before every request
     * @param handler
     * @returns
     */
    registerGlobalMiddleware(handler: express.RequestHandler): Promise<void>;
    /**
     * @description - The handler to register as a middleware that can be used in CRUD operations, if name is not provided, function name will be used instead
     * @param handler
     * @param name
     * @returns
     */
    registerMiddleware(handlerData: {
        handler: express.RequestHandler;
        name?: string;
    }): Promise<void>;
    /**
     * @description - Creates basic CRUD operations for a given entity
     * @description - The entity must be a typeorm EntitySchema
     * @description - Creates an index, show, create, update, and delete operation
     * @param entity - The entity to create CRUD operations for
     */
    makeCRUD<T extends typeorm__default.BaseEntity>(entity: new () => T, middlewares?: string[], apiVersion?: string): void;
    /**
     * @description - Customize the index CRUD operation for a given entity with custom hooks
     * @param type Hook to customize the base CRUD operations
     */
    seasonIndexCRUD<T extends typeorm__default.BaseEntity>(entity: new () => T, editIndexCrud: EditIndexType<T>): void;
    /**
     * @description - Customize the show CRUD operation for a given entity with custom hooks
     * @param type Hook to customize the base CRUD operations
     */
    seasonShowCRUD<T extends typeorm__default.BaseEntity>(entity: new () => T, editShowCrud: EditShowType<T>): void;
    /**
     * @description - Customize the store CRUD operation for a given entity with custom hooks
     * @param type Hook to customize the base CRUD operations
     */
    seasonStoreCRUD<T extends typeorm__default.BaseEntity>(entity: new () => T, editStoreCrud: EditStoreType<T>): void;
    /**
     * @description - Customize the update CRUD operation for a given entity with custom hooks
     * @param type Hook to customize the base CRUD operations
     */
    seasonUpdateCRUD<T extends typeorm__default.BaseEntity>(entity: new () => T, editUpdateCrud: EditUpdateType<T>): void;
    /**
     * @description - Customize the delete CRUD operation for a given entity with custom hooks
     * @param type Hook to customize the base CRUD operations
     */
    seasonDeleteCRUD<T extends typeorm__default.BaseEntity>(entity: new () => T, editDeleteCrud: EditDeleteType<T>): void;
    router(): express.Router;
    use(...handlers: express.RequestHandler<ParamsDictionary, any, any, QueryString__default.ParsedQs, Record<string, any>>[]): express.Application;
    useCors(corsOptions?: cors.CorsOptions): express.Application;
    protected registerAuthRoutes(): void;
    protected authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void>;
}

declare enum HTTPRequestMethods {
    get = "get",
    post = "post",
    put = "put",
    patch = "patch",
    delete = "delete"
}
declare class Router$1 {
    protected server: Server;
    protected internalPrefix?: string;
    protected middlewares?: string[];
    constructor(prefix?: string, middlewares?: string[]);
    /**
     * @description Set the server for the router, note: is not necessary to call this method
     * @param server Express Application
     * @internal
     * @returns void
     */
    setServer(server: Server): void;
    group(cb: (router: Router$1) => void, prefix?: string, middlewares?: string[]): Router$1;
    get(path: string, controller: express.RequestHandler, middlewares?: string[]): void;
    post(path: string, controller: express.RequestHandler, middlewares?: string[]): void;
    put(path: string, controller: express.RequestHandler, middlewares?: string[]): void;
    patch(path: string, controller: express.RequestHandler, middlewares?: string[]): void;
    delete(path: string, controller: express.RequestHandler, middlewares?: string[]): void;
    protected parseHandler(method: HTTPRequestMethods, path: string, controller: express.RequestHandler, middlewares?: string[]): void;
    static validatePath(str: string): string;
}

declare const _default: {
    Server: typeof Server;
};

declare const Logger: winston.Logger;
declare const createServer: typeof Server.create;
declare const Router: Router$1;
declare const Request: express.Request<express_serve_static_core.ParamsDictionary, any, any, QueryString.ParsedQs, Record<string, any>>;
declare const Response: express.Response<any, Record<string, any>>;
declare const Application: express.Application;

export { Application, Logger, Request, Response, Router, createServer, _default as default };
