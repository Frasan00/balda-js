import Server from '../Server/Server';
import { parseMiddlewares } from '../Server/ServerUtils';
import express from '../Server/Customization';

enum HTTPRequestMethods {
  get = 'get',
  post = 'post',
  put = 'put',
  patch = 'patch',
  delete = 'delete',
}

export class Router {
  protected server!: Server;
  protected internalPrefix?: string;
  protected middlewares?: string[];

  constructor(prefix?: string, middlewares?: string[]) {
    this.internalPrefix = prefix ? Router.validatePath(prefix) : undefined;
    this.middlewares = middlewares;
  }

  /**
   * @description Set the server for the router, note: is not necessary to call this method
   * @param server Express Application
   * @internal
   * @returns void
   */
  public setServer(server: Server): void {
    this.server = server;
  }

  public group(cb: (router: Router) => void, prefix?: string, middlewares?: string[]): Router {
    const newPrefix = `${this.internalPrefix || ''}/${prefix || ''}`;
    const newMiddlewares = [...(this.middlewares ?? []), ...(middlewares ?? [])];
    const router = new Router(
      newPrefix === '/' ? undefined : Router.validatePath(newPrefix),
      newMiddlewares
    );
    router.setServer(this.server);
    cb(router);

    return this;
  }

  public get(path: string, controller: express.RequestHandler, middlewares?: string[]): void {
    this.parseHandler(HTTPRequestMethods.get, path, controller, middlewares);
  }

  public post(path: string, controller: express.RequestHandler, middlewares?: string[]): void {
    this.parseHandler(HTTPRequestMethods.post, path, controller, middlewares);
  }

  public put(path: string, controller: express.RequestHandler, middlewares?: string[]): void {
    this.parseHandler(HTTPRequestMethods.put, path, controller, middlewares);
  }

  public patch(path: string, controller: express.RequestHandler, middlewares?: string[]): void {
    this.parseHandler(HTTPRequestMethods.patch, path, controller, middlewares);
  }

  public delete(path: string, controller: express.RequestHandler, middlewares?: string[]): void {
    this.parseHandler(HTTPRequestMethods.delete, path, controller, middlewares);
  }

  protected parseHandler(
    method: HTTPRequestMethods,
    path: string,
    controller: express.RequestHandler,
    middlewares?: string[]
  ) {
    if (!this.server) {
      throw new Error('Server not set');
    }

    if (this.internalPrefix) {
      path = Router.validatePath(`${this.internalPrefix}${path}`);
    }

    const parsedMiddlewares = middlewares ? parseMiddlewares(this.server, middlewares) : [];
    switch (method) {
      case HTTPRequestMethods.get:
        this.server.app.get(path, parsedMiddlewares, controller);
        return;
      case HTTPRequestMethods.post:
        this.server.app.post(path, parsedMiddlewares, controller);
        return;
      case HTTPRequestMethods.put:
        this.server.app.put(path, parsedMiddlewares, controller);
        return;
      case HTTPRequestMethods.patch:
        this.server.app.patch(path, parsedMiddlewares, controller);
        return;
      case HTTPRequestMethods.delete:
        this.server.app.delete(path, parsedMiddlewares, controller);
        return;
      default:
        return;
    }
  }

  public static validatePath(str: string): string {
    if (!str.startsWith('/')) {
      str = `/${str}`;
    }

    if (!str.endsWith('/')) {
      str = `${str}/`;
    }

    return str.replace(/\/+/g, '/');
  }
}

export default new Router();
