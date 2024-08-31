import logger from '../Logger';
import Server from './Server/Server';
import ServerInput from './Server/ServerTypes';
import express from './Server/Customization';
import router from './Router/Router';
import { createValidator as CreateValidator } from './Validator/validator';
import { createEnvSchema, getInstance } from './Env/envManager';

export default {
  Server,
};

export const Logger = logger;
export const createServer = Server.create;
export type ServerOptions = ServerInput;
export const Router = router;
export const Request = express.request;
export const Response = express.response;
export const Application = express.application;
export const createValidator = CreateValidator;
export const createEnvManager = createEnvSchema;
export const getEnvManager = getInstance;
