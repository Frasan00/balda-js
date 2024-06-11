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
    queryBuilder: () => typeorm.SelectQueryBuilder<T>,
    beforeFetchData: any,
    res: express.Response
  ) => Promise<T[]>;
  afterFetch: (req: express.Request, duringFetchData: T[], res: express.Response) => Promise<void>;
  middlewares?: string[];
};

export type ShowType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'get';
  beforeFetch: (req: express.Request) => Promise<any>;
  duringFetch: (
    req: express.Request,
    queryBuilder: typeorm.SelectQueryBuilder<T>,
    beforeFetchData: any,
    res: express.Response
  ) => Promise<T>;
  afterFetch: (req: express.Request, duringFetchData: T, res: express.Response) => Promise<void>;
  middlewares?: string[];
};

export type StoreType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'post';
  beforeCreate: (req: express.Request) => Promise<any>;
  duringCreate: (
    req: express.Request,
    queryBuilder: typeorm.SelectQueryBuilder<T>,
    beforeCreateData: any,
    res: express.Response
  ) => Promise<T> | Promise<T[]>;
  afterCreate: (
    req: express.Request,
    duringCreateData: T | T[],
    res: express.Response
  ) => Promise<void>;
  middlewares?: string[];
};

export type UpdateType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'put' | 'patch';
  beforeUpdate: (req: express.Request) => Promise<any>;
  duringUpdate: (
    req: express.Request,
    queryBuilder: typeorm.SelectQueryBuilder<T>,
    beforeUpdateData: any,
    res: express.Response
  ) => Promise<T> | Promise<T[]>;
  afterUpdate: (
    req: express.Request,
    duringUpdateData: T | T[],
    res: express.Response
  ) => Promise<void>;
  middlewares?: string[];
};

export type DeleteType<T extends typeorm.BaseEntity> = {
  path: string;
  method: 'delete';
  beforeDelete: (req: express.Request) => Promise<any>;
  duringDelete: (
    req: express.Request,
    queryBuilder: typeorm.SelectQueryBuilder<T>,
    beforeDeleteData: any,
    res: express.Response
  ) => Promise<T> | Promise<T[]>;
  afterDelete: (
    req: express.Request,
    duringDeleteData: T | T[],
    res: express.Response
  ) => Promise<void>;
  middlewares?: string[];
};
