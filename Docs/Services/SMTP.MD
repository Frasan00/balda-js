# SMTP

- balda uses nodemailer package to send emails

## prerequisites
- Before using smtp service you must download the drivers for it

```shell
npm install nodemailer

yarn add nodemailer
```

## Setup smtp service

```typescript
import { createServer } from 'balda';

const server = await createServer({
    port: 80,
    host: '0.0.0.0',
    services: {
      smtp: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        from: process.env.SMTP_FROM,
      },
    },
     onServiceStartUp: {
        smtp: async () => {
            console.log('SMTP Connected');
        },
     }
});

// you will be able to access the smtp connection with
server.smtp
```