import { Application } from "express";
import { generateDelete } from "./generateDelete";
import { generateGet } from "./generateGet";
import { generateGetByIds } from "./generateGetByIds";
import { generatePatch } from "./generatePatch";
import { generatePost } from "./generatePost";
import { generatePut } from "./generatePut";
import { EnrichedModel, Model, Routes, TrackChangesFn } from "./types";
import { Request, Response } from "express";

type Temp<AccessType> = {
  hasAccess: (request: Request, response: Response) => Promise<AccessType>;
  title: string;
  description: string;
};

const addCrud = <AccessType>({
  prefix,
  app,
  model,
  routes,
  trackChanges,
  idField = "id",
}: {
  prefix: string;
  app: Application;
  model: Model;
  routes: Routes<AccessType>;
  trackChanges?: TrackChangesFn<AccessType>;
  idField?: string;
}) => {
  const methods = generateMethods(
    prefix,
    model as EnrichedModel<Model>,
    routes,
    trackChanges,
    idField
  );

  Object.keys(methods).forEach((method) =>
    Object.keys(methods[method]).forEach((route) =>
      app[method](prefix + route, methods[method][route])
    )
  );
};

const generateMethods = <AccessType>(
  prefix: string,
  useModel: EnrichedModel<Model>,
  routes: Routes<AccessType>,
  trackChanges: TrackChangesFn<AccessType> | undefined,
  idField: string
) => {
  const res = { get: {}, post: {}, put: {}, patch: {}, delete: {} };
  if (routes.get) {
    res.get[""] = generateGet({
      prefix,
      Model: useModel,
      routeConfig: routes.get,
      trackChanges,
      idField,
    });
  }
  if (routes.getByIds) {
    res.get[`/:${idField}s`] = generateGetByIds<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.getByIds,
      trackChanges,
      idField,
    });
  }
  if (routes.post) {
    res.post[""] = generatePost<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.post,
      trackChanges,
      idField,
    });
  }
  if (routes.put) {
    res.put["/:" + idField] = generatePut<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.put,
      trackChanges,
      idField,
    });
  }
  if (routes.patch) {
    res.patch["/:" + idField] = generatePatch<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.patch,
      trackChanges,
      idField,
    });
  }
  if (routes.delete) {
    res.delete["/:" + idField + "s"] = generateDelete({
      prefix,
      Model: useModel,
      routeConfig: routes.delete,
      trackChanges,
      idField,
    });
  }
  return res;
};

export { addCrud, generateMethods };
