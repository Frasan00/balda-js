import express from 'express';
import mongoose from 'mongoose';
import { RedisClientOptions } from 'redis';
import * as typeorm from 'typeorm';
import SMTPTransport = require('nodemailer/lib/smtp-transport');

/**
 * SwaggerOptions
 * @description Options for Swagger
 * @property {string} pathToSwaggerFile - Path to the swagger file optional, if not provided root path will be used
 * @property {string} resourcePath - Api resource path, if none provided /docs will be used
 */
export type SwaggerOptions = {
  title?: string;
  version?: string;
  description?: string;
};

type ServerOptions = {
  port: number;
  host: string;
  expressInstance?: express.Application;
  services?: {
    sql?: typeorm.DataSourceOptions;
    redis?: RedisClientOptions;
    mongo?: mongoose.ConnectOptions & { url: string };
    smtp?: string | SMTPTransport | SMTPTransport.Options;
    auth?: boolean;
    swagger?: SwaggerOptions;
  };
  onServiceStartUp?: {
    sql?: () => void;
    redis?: () => void;
    mongo?: () => void;
    smtp?: () => void;
  };
};

export default ServerOptions;
