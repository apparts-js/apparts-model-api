import { Application } from "express";
import { generateDelete } from "./generateDelete";
import { generateGet } from "./generateGet";
import { generateGetByIds } from "./generateGetByIds";
import { generatePatch } from "./generatePatch";
import { generatePost } from "./generatePost";
import { generatePut } from "./generatePut";
import { EnrichedModel, Model, Routes, TrackChangesFn } from "./types";
import * as types from "@apparts/types";

const addCrud = <AccessType, T extends types.Obj<types.Required, any>>({
  prefix,
  app,
  model,
  routes,
  trackChanges,
  idField,
  extraPathFields,
}: {
  prefix: string;
  app: Application;
  model: Model<T>;
  routes: Routes<AccessType, T>;
  trackChanges?: TrackChangesFn<AccessType>;
  idField?: keyof types.InferType<T>;
  extraPathFields?: types.Obj<types.Required, any>;
}) => {
  const methods = generateMethods(
    prefix,
    model as EnrichedModel<T>,
    routes,
    trackChanges,
    idField || ("id" as keyof types.InferType<T>),
    extraPathFields
  );

  Object.keys(methods).forEach((method) =>
    Object.keys(methods[method]).forEach((route) =>
      app[method](prefix + route, methods[method][route])
    )
  );
};

const generateMethods = <AccessType, T extends types.Obj<types.Required, any>>(
  prefix: string,
  useModel: EnrichedModel<T>,
  routes: Routes<AccessType, T>,
  trackChanges: TrackChangesFn<AccessType> | undefined,
  idField: keyof types.InferType<T>,
  extraPathFields?: types.Obj<types.Required, any>
) => {
  if (extraPathFields) {
    for (const key in extraPathFields.getKeys()) {
      const prefixBefore = prefix;
      prefix = prefix.replace(new RegExp(`/:${key}/`), "/");
      if (prefixBefore === prefix) {
        throw new Error(
          `Cannot ignore field "${key}" in path "${prefixBefore}" because it does not exist in the path.`
        );
      }
    }
  }
  extraPathFields = extraPathFields || types.obj({});

  const res = { get: {}, post: {}, put: {}, patch: {}, delete: {} };
  if (routes.get) {
    res.get[""] = generateGet({
      prefix,
      Model: useModel,
      routeConfig: routes.get,
      trackChanges,
      idField,
      extraPathFields,
    });
  }
  if (routes.getByIds) {
    res.get[`/:${String(idField)}s`] = generateGetByIds<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.getByIds,
      trackChanges,
      idField,
      extraPathFields,
    });
  }
  if (routes.post) {
    res.post[""] = generatePost<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.post,
      trackChanges,
      idField,
      extraPathFields,
    });
  }
  if (routes.put) {
    res.put["/:" + String(idField)] = generatePut<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.put,
      trackChanges,
      idField,
      extraPathFields,
    });
  }
  if (routes.patch) {
    res.patch["/:" + String(idField)] = generatePatch<AccessType>({
      prefix,
      Model: useModel,
      routeConfig: routes.patch,
      trackChanges,
      idField,
      extraPathFields,
    });
  }
  if (routes.delete) {
    res.delete["/:" + String(idField) + "s"] = generateDelete({
      prefix,
      Model: useModel,
      routeConfig: routes.delete,
      trackChanges,
      idField,
      extraPathFields,
    });
  }
  return res;
};

export { addCrud, generateMethods };
