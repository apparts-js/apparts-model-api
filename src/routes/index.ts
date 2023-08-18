import generateGet from "./generateGet";
import generateGetByIds from "./generateGetByIds";
import generatePost from "./generatePost";
import generatePut from "./generatePut";
import generatePatch from "./generatePatch";
import generateDelete from "./generateDelete";
import { Application, Response } from "express";
import { useModel } from "@apparts/model";
import { Request } from "express";

type RouteConfig<AccessType> = {
  hasAccess: (request: Request, response: Response) => Promise<AccessType>;
  title?: string;
  description?: string;
};

const addCrud = <AccessType>({
  prefix,
  app,
  model,
  routes,
  trackChanges,
  idField = "id",
}: {
  prefix?: string;
  app: Application;
  model: ReturnType<typeof useModel>;
  routes: {
    get?: RouteConfig<AccessType>;
    getByIds?: RouteConfig<AccessType>;
    post?: RouteConfig<AccessType>;
    put?: RouteConfig<AccessType>;
    patch?: RouteConfig<AccessType>;
    delete?: RouteConfig<AccessType>;
  };
  trackChanges?: (
    me: AccessType,
    contentBefore: unknown,
    contentAfter: unknown
  ) => Promise<void>;
  idField?: string;
}) => {
  const methods = generateMethods(prefix, model, routes, trackChanges, idField);

  Object.keys(methods).forEach((method) =>
    Object.keys(methods[method]).forEach((route) =>
      app[method](prefix + route, methods[method][route])
    )
  );
};

const generateMethods = (prefix, useModel, routes, trackChanges, idField) => {
  const res = { get: {}, post: {}, put: {}, patch: {}, delete: {} };
  if (routes.get) {
    res.get[""] = generateGet(prefix, useModel, routes.get);
  }
  if (routes.getByIds) {
    res.get[`/:${idField}s`] = generateGetByIds(
      prefix,
      useModel,
      routes.getByIds,
      idField
    );
  }
  if (routes.post) {
    res.post[""] = generatePost(
      prefix,
      useModel,
      routes.post,
      trackChanges,
      idField
    );
  }
  if (routes.put) {
    res.put["/:" + idField] = generatePut(
      prefix,
      useModel,
      routes.put,
      trackChanges,
      idField
    );
  }
  if (routes.patch) {
    res.patch["/:" + idField] = generatePatch(
      prefix,
      useModel,
      routes.patch,
      trackChanges,
      idField
    );
  }
  if (routes.delete) {
    res.delete["/:" + idField + "s"] = generateDelete(
      prefix,
      useModel,
      routes.delete,
      trackChanges,
      idField
    );
  }
  return res;
};

export { addCrud, generateMethods };
