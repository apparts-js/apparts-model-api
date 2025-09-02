import { BaseModel } from "@apparts/model";
import { Request, Response } from "express";
import * as types from "@apparts/types";

export type RouteConfig<AccessType> = {
  hasAccess: (request: Request, response: Response) => Promise<AccessType>;
  title?: string;
  description?: string;
};

export type Routes<AccessType> = {
  get?: RouteConfig<AccessType>;
  getByIds?: RouteConfig<AccessType>;
  post?: RouteConfig<AccessType>;
  put?: RouteConfig<AccessType>;
  patch?: RouteConfig<AccessType>;
  delete?: RouteConfig<AccessType>;
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
  routeConfig: RouteConfig<AccessType>;
  trackChanges?: TrackChangesFn<AccessType> | undefined;
  idField: string;
};
