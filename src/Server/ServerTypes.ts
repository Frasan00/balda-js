import express from 'express';
import mongoose from 'mongoose';
import { RedisClientOptions } from 'redis';
import * as typeorm from 'typeorm';
import SMTPTransport = require('nodemailer/lib/smtp-transport');


export type AuthOptions = {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  UserModel: typeof typeorm.BaseEntity;
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
    auth?: AuthOptions;
  };
  onServiceStartUp?: {
    sql?: () => void;
    redis?: () => void;
    mongo?: () => void;
    smtp?: () => void;
  };
};

export default ServerOptions;
