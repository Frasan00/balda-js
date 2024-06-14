import * as typeorm from 'typeorm';
import { CRUDType, IndexType, ShowType, StoreType, UpdateType } from './CrudTypes';
import Server from '../Server/Server';
import express from 'express';
import { CrudTypeEnum } from './Crud';
import { parseMiddlewares, filterRouteByMethodAndPath } from '../Server/ServerUtils';

export function registerOrUpdateCRUDRoutes<T extends typeorm.BaseEntity>(
  server: Server,
  cruds: Record<string, CRUDType<T>>,
  entity: new () => typeorm.BaseEntity
): void {
  for (const [key, crud] of Object.entries(cruds)) {
    const middlewares = parseMiddlewares(server, crud.middlewares);

    switch (key) {
      case CrudTypeEnum.indexCrud:
        const indexCrud = crud as IndexType<T>;
        const newStackIndex = filterRouteByMethodAndPath(server.app, 'GET', indexCrud.path);
        if (newStackIndex) {
          server.app._router.stack = newStackIndex;
        }

        server.app.get(
          indexCrud.path,
          [...middlewares],
          async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
              const beforeFetchData = await indexCrud.beforeFetch(req);
              const data = await indexCrud.duringFetch(
                req,
                () => server.sql.getRepository(entity as new () => T).createQueryBuilder(),
                beforeFetchData,
                res
              );
              await indexCrud.afterFetch(req, data, res);
            } catch (error) {
              next(error);
            }
          }
        );
        break;

      case CrudTypeEnum.showCrud:
        const showCrud = crud as ShowType<T>;
        const newStackShow = filterRouteByMethodAndPath(server.app, 'GET', showCrud.path);
        if (newStackShow) {
          server.app._router.stack = newStackShow;
        }
        server.app.get(
          showCrud.path,
          [...middlewares],
          async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
              const beforeFetchData = await showCrud.beforeFetch(req);
              const data = await showCrud.duringFetch(
                req,
                () => server.sql.getRepository(entity as new () => T).createQueryBuilder(),
                beforeFetchData,
                res
              );
              await showCrud.afterFetch(req, data, res);
            } catch (error) {
              next(error);
            }
          }
        );
        break;

      case CrudTypeEnum.storeCrud:
        const postCrud = crud as StoreType<T>;
        const newStackStore = filterRouteByMethodAndPath(server.app, 'POST', postCrud.path);
        if (newStackStore) {
          server.app._router.stack = newStackStore;
        }

        server.app.post(
          crud.path,
          [...middlewares],
          async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
              const beforeCreateData = await postCrud.beforeCreate(req);
              const data = await postCrud.duringCreate(
                req,
                () => server.sql.getRepository(entity as new () => T),
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
        const newStackUpdate = filterRouteByMethodAndPath(server.app, 'PATCH', updateCrud.path);
        if (newStackUpdate) {
          server.app._router.stack = newStackUpdate;
        }

        server.app.patch(
          crud.path,
          [...middlewares],
          async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
              const beforeUpdateData = await updateCrud.beforeUpdate(req);
              const data = await updateCrud.duringUpdate(
                req,
                () => server.sql.getRepository(entity as new () => T),
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
        const newStackDelete = filterRouteByMethodAndPath(server.app, 'DELETE', deleteCrud.path);
        if (newStackDelete) {
          server.app._router.stack = newStackDelete;
        }

        server.app.delete(
          crud.path,
          [...middlewares],
          async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
              const beforeDeleteData = await deleteCrud.beforeUpdate(req);
              const data = await deleteCrud.duringUpdate(
                req,
                () => server.sql.getRepository(entity as new () => T),
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
