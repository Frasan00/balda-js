# Env Manager

- balda uses envitron npm package for env management

# Environment-manager

- Simple environment manager for node.js

## How To Use

### Schema Based Env Manager
```typescript
import { createEnvSchema } from "balda";

const env = await createEnvSchema(
  (vine) => {
    return vine.object({
      PORT: vine.number(),
      NODE_ENV: vine.string(),
    });
  },
  {
    logs: false,
    throwErrorOnValidationFail: false,
    rootPath: process.cwd(),
    envFileHierarchy: ['.env'],
  }
);

// Retrieve all the environment variables
const allEnvs = env.getAll();

// Retrieve a specific schema environment variable with a default value, the type will be inferred from the schema
const schemaBasedNodeEnv = env.get('NODE_ENV', "development");

// Retrieve searching on all the environment variables regardless of the schema
const outsideSchemaEnv = env.getRaw('NON_SCHEMA_ENV');
```

### Schema Less Environment Manager
```typescript
import { getInstance } from "balda";

const schemaLessEnvManager = getInstance({
  rootPath: __dirname,
  envFileHierarchy: ['.env'],
});

// Retrieve all the environment variables
const allEnvsSchemaLess = schemaLessEnvManager.getAll();

// Retrieve an env from the environment manager
const nodeEnv = schemaLessEnvManager.get('NODE_ENV', "development");
```

## Env Example

- To better understand the functionality of the env manager is an example of all handled use cases and resulting values

```dotenv
PORT=80
NODE_ENV=development
DATABASE_URL = " Example "
API_KEY=' 12345 '
DEBUG=true
EMPTY_VALUE=
QUOTED_EMPTY_VALUE=""
SINGLE_QUOTED_EMPTY_VALUE=''
SPACED_KEY = spaced_value
SPACED_KEY_WITH_QUOTES = " spaced_value "
MULTILINE_VALUE="This is a
multiline value"
SPECIAL_CHARS_IN_VALUE="!@#$%^&*()_+"
TRAILING_SPACES=trailing_spaces
```

- Will be parsed into:
```any
{
  PORT: '80',
  NODE_ENV: 'development',
  DATABASE_URL: ' Example ',
  API_KEY: ' 12345 ',
  DEBUG: 'true',
  QUOTED_EMPTY_VALUE: undefined,
  SINGLE_QUOTED_EMPTY_VALUE: undefined,
  SPACED_KEY: 'spaced_value',
  SPACED_KEY_WITH_QUOTES: ' spaced_value ',
  MULTILINE_VALUE: '"This',
  SPECIAL_CHARS_IN_VALUE: '!@#$%^&*()_+',
  TRAILING_SPACES: 'trailing_spaces'
}
```