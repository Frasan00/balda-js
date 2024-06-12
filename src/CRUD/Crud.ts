import typeorm, { SelectQueryBuilder } from 'typeorm';
import { DeleteType, IndexType, ShowType, StoreType, UpdateType } from './CrudTypes';
import express from '../Server/Customization';

export enum CrudTypeEnum {
  indexCrud = 'indexCrud',
  showCrud = 'showCrud',
  storeCrud = 'storeCrud',
  updateCrud = 'updateCrud',
  deleteCrud = 'deleteCrud',
}

export function makeBaseCruds<T extends typeorm.BaseEntity>(
  path: string
): {
  indexCrud: IndexType<T>;
  showCrud: ShowType<T>;
  storeCrud: StoreType<T>;
  updateCrud: UpdateType<T>;
  deleteCrud: DeleteType<T>;
} {
  const indexCrud: IndexType<T> = {
    path: path && path.startsWith('/') ? path : `/${path}`,
    method: 'get',
    beforeFetch: async (_req: express.Request) => {},
    duringFetch: async (
      _req: express.Request,
      selectQueryBuilder: () => SelectQueryBuilder<T>,
      _beforeFetchData: any,
      _res: express.Response
    ) => {
      const queryBuilder = selectQueryBuilder();
      return await queryBuilder.getMany();
    },
    afterFetch: async (_req: express.Request, duringFetchData: T[], res: express.Response) => {
      res.ok(duringFetchData || []);
    },
    middlewares: [],
  };

  const showCrud: ShowType<T> = {
    path: path && path.startsWith('/') ? `${path}/:id` : `/${path}/:id`,
    method: 'get',
    beforeFetch: async (_req: express.Request) => {},
    duringFetch: async (
      req: express.Request,
      selectQueryBuilder: () => SelectQueryBuilder<T>,
      _beforeFetchData: any,
      _res: express.Response
    ) => {
      const queryBuilder = selectQueryBuilder();
      return await queryBuilder.where('id = :id', { id: req.params.id }).getOneOrFail();
    },
    afterFetch: async (_req: express.Request, duringFetchData: T, res: express.Response) => {
      res.ok(duringFetchData || []);
    },
    middlewares: [],
  };

  const storeCrud: StoreType<T> = {
    path: path && path.startsWith('/') ? `${path}` : `/${path}`,
    method: 'post',
    beforeCreate: async (_req: express.Request) => {},
    duringCreate: async (
      req: express.Request,
      insertQueryBuilder: () => typeorm.Repository<T>,
      _beforeCreateData: any,
      _res: express.Response
    ) => {
      const queryBuilder = insertQueryBuilder();
      return await queryBuilder.save(req.body);
    },
    afterCreate: async (_req: express.Request, duringCreateData: T, res: express.Response) => {
      res.ok(duringCreateData);
    },
    middlewares: [],
  };

  const updateCrud: UpdateType<T> = {
    path: path && path.startsWith('/') ? `${path}/:id` : `/${path}/:id`,
    method: 'patch',
    beforeUpdate: async (_req: express.Request) => {},
    duringUpdate: async (
      req: express.Request,
      queryBuilder: () => typeorm.Repository<T>,
      _beforeUpdateData: any,
      _res: express.Response
    ) => {
      const query = queryBuilder();
      const entityToUpdate = await query
        .createQueryBuilder()
        .where('id = :id', { id: req.params.id })
        .getOneOrFail();
      return await query.save({ ...entityToUpdate, ...req.body });
    },
    afterUpdate: async (_req: express.Request, duringUpdateData: T, res: express.Response) => {
      res.ok(duringUpdateData);
    },
    middlewares: [],
  };

  const deleteCrud: DeleteType<T> = {
    path: path && path.startsWith('/') ? `${path}/:id` : `/${path}/:id`,
    method: 'delete',
    beforeDelete: async (_req: express.Request) => {},
    duringDelete: async (
      req: express.Request,
      deleteQueryBuilder: () => typeorm.Repository<T>,
      _beforeDeleteData: any,
      _res: express.Response
    ) => {
      const repository = deleteQueryBuilder();
      const data = await repository
        .createQueryBuilder()
        .where('id = :id', { id: req.params.id })
        .getOneOrFail();
      await repository.delete(req.params.id);
      return data;
    },
    afterDelete: async (_req: express.Request, duringDeleteData: T, res: express.Response) => {
      res.ok(duringDeleteData);
    },
    middlewares: [],
  };

  return {
    indexCrud: indexCrud,
    showCrud: showCrud,
    storeCrud: storeCrud,
    updateCrud: updateCrud,
    deleteCrud: deleteCrud,
  };
}
