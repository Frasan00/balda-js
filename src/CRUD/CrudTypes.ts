import express from '../Server/Customization';
import * as typeorm from 'typeorm';

export type CRUDType<T extends typeorm.BaseEntity> =
  | IndexType<T>
  | ShowType<T>
  | StoreType<T>
  | UpdateType<T>
  | DeleteType<T>;

export type IndexType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'get';
  beforeFetch: (req: express.Request) => Promise<any>;
  duringFetch: (
    req: express.Request,
    selectQueryBuilder: () => typeorm.SelectQueryBuilder<T>,
    beforeFetchData: any,
    res: express.Response
  ) => Promise<T[]>;
  afterFetch: (req: express.Request, duringFetchData: T[], res: express.Response) => Promise<void>;
  middlewares: string[];
};

export type ShowType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'get';
  beforeFetch: (req: express.Request) => Promise<any>;
  duringFetch: (
    req: express.Request,
    selectQueryBuilder: () => typeorm.SelectQueryBuilder<T>,
    beforeFetchData: any,
    res: express.Response
  ) => Promise<T>;
  afterFetch: (req: express.Request, duringFetchData: T, res: express.Response) => Promise<void>;
  middlewares: string[];
};

export type StoreType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'post';
  beforeCreate: (req: express.Request) => Promise<any>;
  duringCreate: (
    req: express.Request,
    insertQueryBuilder: () => typeorm.Repository<T>,
    beforeCreateData: any,
    res: express.Response
  ) => Promise<T>;
  afterCreate: (req: express.Request, duringCreateData: T, res: express.Response) => Promise<void>;
  middlewares: string[];
};

export type UpdateType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'patch';
  beforeUpdate: (req: express.Request) => Promise<any>;
  duringUpdate: (
    req: express.Request,
    updateQueryBuilder: () => typeorm.Repository<T>,
    beforeUpdateData: any,
    res: express.Response
  ) => Promise<T>;
  afterUpdate: (req: express.Request, duringUpdateData: T, res: express.Response) => Promise<void>;
  middlewares: string[];
};

export type DeleteType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'delete';
  beforeDelete: (req: express.Request) => Promise<any>;
  duringDelete: (
    req: express.Request,
    deleteQueryBuilder: () => typeorm.Repository<T>,
    beforeDeleteData: any,
    res: express.Response
  ) => Promise<T>;
  afterDelete: (req: express.Request, duringDeleteData: T, res: express.Response) => Promise<void>;
  middlewares: string[];
};
