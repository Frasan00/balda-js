import express from 'express';
import * as typeorm from 'typeorm';
import { errors } from '@vinejs/vine';
import * as vine from '@vinejs/vine';
import { SchemaTypes } from '@vinejs/vine/build/src/types';

export type ReturnTypeObject<Properties extends Record<string, SchemaTypes>> = ReturnType<
  typeof vine.default.object<Properties>
>;
export type VineCompileReturnType<T extends SchemaTypes> = ReturnType<
  typeof vine.default.compile<T>
>;
export type VineValidateReturnType<T extends SchemaTypes> = ReturnType<
  typeof vine.default.validate<T>
>;

type GenericUser = {
  [key: string]: any;
};

type Only<T, K extends keyof T> = {
  [P in K]: T[P];
};

declare global {
  namespace Express {
    interface Request {
      pickEntityValues: <T extends typeorm.BaseEntity, K extends keyof T>(
        entity: new () => T,
        keys: K[]
      ) => Only<T, K>;
      user: GenericUser;
      getUser<T>(): T;
      validationError?: Error;
      validateBody: <T extends SchemaTypes>(
        schema: VineCompileReturnType<T>
      ) => Promise<VineValidateReturnType<T>>;
      validateQueryStrings: <T extends SchemaTypes>(
        schema: VineCompileReturnType<T>
      ) => Promise<VineValidateReturnType<T>>;
    }

    interface NextFunction {}

    interface Response {
      continue: () => void;
      switchProtocol: () => void;
      processing: () => void;
      earlyHints: () => void;

      ok: (body: any) => void;
      created: (body: any) => void;
      noContent: () => void;
      partialContent: (body: any) => void;

      multipleChoices: (body: any) => void;
      movedPermanently: (body: any) => void;
      seeOther: (body: any) => void;
      found: (body: any) => void;

      badRequest: (body: any) => void;
      unauthorized: (body: any) => void;
      forbidden: (body: any) => void;
      notFound: (body: any) => void;
      requestTimeout: (body: any) => void;
      conflict: (body: any) => void;
      unprocessableEntity: (body: any) => void;
      tooManyRequests: (body: any) => void;
      paymentRequired: (body: any) => void;

      internalServerError: (body: any) => void;
      notImplemented: (body: any) => void;
      badGateway: (body: any) => void;
      serviceUnavailable: (body: any) => void;
    }
  }
}

/**
 * @description Retrieves only the specified keys from the request body or query parameters (body as priority)
 * @description If the key is not found in the request body or query or isn't included in the given Model, it will not be given in the result
 * @param entity - typeorm entity to use as a schema
 * @param keys - keys to extract from the request body or query
 * @returns
 */
express.request.pickEntityValues = function <T extends object, K extends keyof T>(
  entity: new () => T,
  keys: K[]
): Only<T, K> {
  const result: any = {};

  const entityInstance = new entity();
  keys.forEach((key) => {
    if (key in entityInstance) {
      result[key] = this.body[key] || this.query[key];
    }
  });

  return result as Only<T, K>;
};

/**
 * @description Validates the request body against the given schema, if the validation fails, the request will return 422 Unprocessable Entity
 * @param schema - Schema to validate the request body, result of vine.compile
 * @returns
 */
express.request.validateBody = async function <T extends SchemaTypes>(
  schema: VineCompileReturnType<T>
): Promise<VineValidateReturnType<T>> {
  try {
    return await schema.validate(this.body);
  } catch (error: any) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      this.validationError = error;
      throw error;
    }

    throw new Error(error);
  }
};

/**
 * @description Validates the request query strings against the given schema, if the validation fails, the request will return 422 Unprocessable Entity
 * @param schema - Schema to validate the request query strings, result of vine.compile
 * @returns
 */
express.request.validateQueryStrings = async function <T extends SchemaTypes>(
  schema: VineCompileReturnType<T>
): Promise<VineValidateReturnType<T>> {
  try {
    return await schema.validate(this.query);
  } catch (error: any) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      this.validationError = error;
      throw error;
    }

    throw new Error(error);
  }
};

express.request.user = {};

/**
 *
 * @param User - Optional parameter to specify the type of user, can also be passed as a generic
 * @returns
 */
express.request.getUser = function <T>() {
  return this.user as T;
};

express.response.continue = function () {
  return this.status(100).send();
};

express.response.switchProtocol = function () {
  return this.status(101).send();
};

express.response.processing = function () {
  return this.status(102).send();
};

express.response.earlyHints = function () {
  return this.status(103).send();
};

express.response.ok = function (body: any) {
  return this.status(200).send(body);
};

express.response.created = function (body: any) {
  return this.status(201).send(body);
};

express.response.noContent = function () {
  return this.status(204).send();
};

express.response.partialContent = function (body?: any) {
  return this.status(206).send(body);
};

express.response.multipleChoices = function (body?: any) {
  return this.status(300).send(body);
};

express.response.movedPermanently = function (body?: any) {
  return this.status(301).send(body);
};

express.response.seeOther = function (body?: any) {
  return this.status(303).send(body);
};

express.response.found = function (body?: any) {
  return this.status(302).send(body);
};

express.response.badRequest = function (body?: any) {
  return this.status(400).send(body);
};

express.response.unauthorized = function (body?: any) {
  return this.status(401).send(body);
};

express.response.paymentRequired = function (body?: any) {
  return this.status(402).send(body);
};

express.response.forbidden = function (body?: any) {
  return this.status(403).send(body);
};

express.response.notFound = function (body?: any) {
  return this.status(404).send(body);
};

express.response.requestTimeout = function (body?: any) {
  return this.status(408).send(body);
};

express.response.conflict = function (body?: any) {
  return this.status(409).send(body);
};

express.response.unprocessableEntity = function (body?: any) {
  return this.status(422).send(body);
};

express.response.tooManyRequests = function (body?: any) {
  return this.status(429).send(body);
};

express.response.internalServerError = function (body?: any) {
  return this.status(500).send(body);
};

express.response.notImplemented = function (body?: any) {
  return this.status(501).send(body);
};

express.response.badGateway = function (body?: any) {
  return this.status(502).send(body);
};

express.response.serviceUnavailable = function (body?: any) {
  return this.status(503).send(body);
};

export default express;
