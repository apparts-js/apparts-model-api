import { BaseModel } from "@apparts/model";
import { Request, Response } from "express";
import * as types from "@apparts/types";

export type InjectedParameters<T extends types.Obj<types.Required, any>> =
  Partial<{
    [key in keyof types.InferType<T>]: (
      request: Request
    ) => Promise<types.InferType<T>[key]> | types.InferType<T>[key];
  }>;

export type RouteConfig<
  AccessType,
  T extends types.Obj<types.Required, any>
> = {
  hasAccess: (request: Request, response: Response) => Promise<AccessType>;
  injectParameters?: InjectedParameters<T>;
  title?: string;
  description?: string;
};

export type Routes<AccessType, T extends types.Obj<types.Required, any>> = {
  get?: RouteConfig<AccessType, T>;
  getByIds?: RouteConfig<AccessType, T>;
  post?: RouteConfig<AccessType, T>;
  put?: RouteConfig<AccessType, T>;
  patch?: RouteConfig<AccessType, T>;
  delete?: RouteConfig<AccessType, T>;
};
export type TrackChangesFn<AccessType> = (
  me: AccessType,
  contentBefore: unknown,
  contentAfter: unknown
) => Promise<void>;

export type Model<T extends types.Obj<types.Required, any>> = new (
  ...ps: any[]
) => BaseModel<T>;

export type EnrichedModel<T extends types.Obj<types.Required, any>> =
  Model<T> & {
    getCollection: () => string;
    getSchema: () => types.Obj<any, any>;
  };

export type GeneratorFnParams<
  AccessType,
  T extends types.Obj<types.Required, any>
> = {
  prefix: string;
  Model: EnrichedModel<T>;
  routeConfig: RouteConfig<AccessType, T>;
  trackChanges?: TrackChangesFn<AccessType> | undefined;
  idField: keyof types.InferType<T>;
};
