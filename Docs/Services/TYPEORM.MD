# Typeorm

- balda is fully integrated with the typerom library for database interactions

## prerequisites
- Before using the typeorm integration you must download the drivers for it

```shell
npm install typeorm reflect-metadata

yarn add typeorm reflect-metadata
```

- This is a suggested tsconfig configuration to use typeorm
```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true, // required
    "emitDecoratorMetadata": true, // required
    "outDir": "./dist",
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- Also you need to install the driver for your database

```shell
npm install pg mysql2

yarn add pg mysql2
```

## Setup typeorm service for sql databases on balda server

```typescript
import { createServer } from 'balda';

const server = await createServer({
    port: 80,
    host: '0.0.0.0',
    services: {
        sql: {
            type,
            host,
            port,
            username,
            password,
            database,
            entities: [],
            logging: true,
            synchronize: false,
            <Every other typeorm connection option>
      },
    },
     onServiceStartUp: {
        // You can customize the service startup with a callback 
        sql: async () => {
            console.log('SQL Connected');
        },
     }
});

// you will be able to access the sql typeorm connection using
server.sql
```