# Redis

- balda uses redis package to interact with no-SQL MongoDB databases

## prerequisites
- Before using redis service you must download the drivers for it

```shell
npm install redis

yarn add redis
```

## Setup redis service

```typescript
import { createServer } from 'balda';

const server = await createServer({
    port: 80,
    host: '0.0.0.0',
    services: {
      redis: {
        url: process.env.REDIS_URL as string,
        password: process.env.REDIS_PASSWORD as string,
        <Every other redis connection option>
      },
    },
     onServiceStartUp: {
        // You can customize the service startup with a callback 
        redis: async () => {
            console.log('REDIS Connected');
        },
     }
});

// you will be able to access the redis connection with
server.redis
```