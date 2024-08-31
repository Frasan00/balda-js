# Balda-js

- Full fletched backend framework built on top of express
- Power up your development with a feature rich environment

## Installation (NOT YET RELEASED)
```shell
    npm install balda
    
    yarn add balda
```


## Server setup

- Start-up a server with balda is pretty straight forward
- This is an example of a minimalistic setup that creates a server on port 80
```typescript
import { createServer } from 'balda';
import express from 'express';

// The createServer method takes optional settings for services and behavior
const server = await createServer({
    port: 80, // default 80
    host: '0.0.0.0', // default '0.0.0.0'
    expressInstance: express(), // optionally you can pass your express application instance and integrate it with the main server
});
```

## Server specific features

- [Error-handling](#error-handling)
- [Request](#request)
- [Response](#response)
- [Validation](#validation)
- [Routes](#routes)
- [middlewares](#middlewares)
- [Make-crud](#make-crud)
- [Season-base-cruds](#season-base-cruds)


## Services
Balda has built-in support for different types of services (all included services are optional)
Since all services are optional you must download packages and drivers for each service you decide to use (more details in each service readme file)

- [Typeorm](./Docs/Services/TYPEORM.MD)
- [Mongo](./Docs/Services/MONGO.MD)
- [Redis](./Docs/Services/REDIS.MD)
- [SMTP](./Docs/Services/SMTP.MD)
- [ENV](./Docs/Services/ENV.MD)
- [Auth] - Experimental not yet stable
- MORE TO COME IN THE FUTURE !!!


## Error Handling
- Every Handler made with makeCRUD method or defined using the Router object automatically catches errors and returns an internal server error to the client even if not handled in the code itself


## Request
- The Request type has been revisited in order to support some extra features
```typescript
// request has a user type that can be accessed in every moment
req.user = server.sql.getRepository()
    .createQueryBuilder(this.auth.userRepository.metadata.targetName)
    .where('id = :id', { id: payload.id })
    .getOne();

// you can also get the user using a custom type to specify the type
const user = req.getUser<User>();

// using pickEntityValues you can take values from request queryParams and body that are included in the Entity type
const data = req.pickEntityValues(User, ['name', 'email']);
```


## Response
- Express Responses have been extended in order to server text based methods for http responses
```typescript
res.continue();
res.switchProtocol();
res.processing();
res.earlyHints();

res.ok({});
res.created({});
res.noContent();
res.partialContent({});

res.multipleChoices({});
res.movedPermanently({});
res.seeOther({});
res.found({});

res.badRequest({});
res.unauthorized({});
res.forbidden({});
res.notFound({});
res.requestTimeout({});
res.conflict({});
res.unprocessableEntity({});
res.tooManyRequests({});

res.internalServerError({});
res.notImplemented({});
res.badGateway({});
res.serviceUnavailable({});
```

## Validation
- Balda uses the popular @vinejs/vine library for body and qs validation, you do not need to having it installed yourself you can use createValidator to receive in the callback a vine instance to use
```typescript
import { createValidator } from 'balda';

const myValidator = createValidator((vine) => {
    return vine.compile(vine.object({ name: vine.string(), email: vine.string() }));
});

// type inferred by the schema
const body = await req.validateBody(myValidator);
const qs = await req.validateQueryStrings(myValidator);
```

## Router
- There is a built in router that makes easier to define nested or more complex route hierarchy
```typescript
import { Router } from 'balda';

// simple route definition
Router.get(
    '/cool-path',
    (_req, res) => {
        res.ok('Cool path');
    },
    ['log', 'auth']
);

// nested route definition
Router.group(
    (router) => {
        router.get(
            '/internal-cool-path',
            (_req, res) => {
                res.ok('Internal cool path');
            },
            ['log']
        );
    },
    '/group',
    ['log']
);
```


## Middlewares
- You can both register a global middleware that runs on each request or a middleware that you can reference by it's name as a string in the route definitions
```typescript
server.registerGlobalMiddleware(async (req, _res, next) => {
    const data = req.pickEntityValues(User, ['name', 'email']);
    console.log('Data: ', data.email);

    next();
});

server.registerMiddleware({
    name: 'log',
    handler: (_req, _res, next: express.NextFunction) => {
        console.log('Middleware log, fine until now');
        next();
    },
});
```


## Make CRUD
- You can automate base CRUDs operations on typeorm models with just a function
```typescript
import * as typeorm from 'typeorm';
import 'reflect-metadata';

// user.ts
@typeorm.Entity()
class User extends typeorm.BaseEntity {
  @typeorm.PrimaryGeneratedColumn()
  id: number;

  @typeorm.Column({ type: 'varchar' })
  name: string;

  @typeorm.Column({ type: 'boolean' })
  active: boolean;

  @typeorm.Column({ type: 'varchar' })
  email: string;

  @typeorm.Column({ type: 'varchar' })
  password: string;
}

// index.ts

// With the model you can also give the middlewares shared between all basic cruds and a version that will be appended to the root of the path
server.makeCRUD(User, [], 'v2'); // generates for routes with basic controllers that allow to GET, POST, PATCH and DELETE the model resources
// generates
/*
* GET /v2/users (index)
* GET /v2/users/:id (show)
* POST /v2/users (create)
* PATCH /v2/users/:id (update)
* DELETE /v2/users/:id (delete)
*/
```


## Season Base CRUDS
- You can customize every base CRUD operation generated with server.makeCRUD with custom hooks
```typescript
server.seasonIndexCRUD(User, {
    beforeFetch: async (_req) => {
        console.log('Before fetch');
    },
    // Must return something coerent with the CRUD type (ex. index must return an array and show must return a single record)
    duringFetch: async (_req, indexQueryBuilder, _res) => {
        console.log('During fetch');
        const queryBuilder = indexQueryBuilder();
        return queryBuilder.where('active = :active', { active: true }).getMany();
    },
    afterFetch: async (req, _data, res) => {
        const user = req.getUser<User>();
        return res.ok('User retrieved, ' + JSON.stringify(user));
    },
    middlewares: ['log'],
});
```