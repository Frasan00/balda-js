# MongoDB

- balda uses mongoose package to interact with no-SQL MongoDB databases

## prerequisites
- Before using mongo service you must download the drivers for it

```shell
npm install mongoose

yarn add mongoose
```

## Setup mongo service

```typescript
import { createServer } from 'balda';

const server = await createServer({
    port: 80,
    host: '0.0.0.0',
    services: {
      mongo: {
        url: process.env.MONGO_URL as string,
        password: "mongo password" // optional,
        <Every other mongoose connection option>
      },
    },
     onServiceStartUp: {
        // You can customize the service startup with a callback 
        mongo: async () => {
            console.log('MONGO Connected');
        },
     }
});

// you will be able to access the mongo connection
server.mongo
```