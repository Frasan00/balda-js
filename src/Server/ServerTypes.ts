import express from 'express';
import * as typeorm from 'typeorm';

type ServerOptions = {
  port?: number;
  host?: string;
  expressInstance?: express.Application;
  entities?: typeorm.EntitySchema<any>[] | Function[];
  services?: {
    sql?: boolean;
    redis?: boolean;
    mongo?: boolean;
    smtp?: boolean;
    auth?: boolean;
  };
  onServiceStartUp?: {
    sql?: () => void;
    redis?: () => void;
    mongo?: () => void;
    smtp?: () => void;
  };
};

export default ServerOptions;
