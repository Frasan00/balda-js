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

  return { indexCrud: indexCrud } as any;
}
