import express from 'express';
import mongoose from 'mongoose';
import { RedisClientOptions } from 'redis';
import * as typeorm from 'typeorm';
import SMTPTransport = require('nodemailer/lib/smtp-transport');

export type SwaggerOptions = {
  path?: string;
  title?: string;
  description?: string;
  version?: string;
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
