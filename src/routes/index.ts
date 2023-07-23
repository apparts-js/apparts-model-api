import generateGet from "./generateGet";
import generateGetByIds from "./generateGetByIds";
import generatePost from "./generatePost";
import generatePut from "./generatePut";
import generatePatch from "./generatePatch";
import generateDelete from "./generateDelete";
import { Application } from "express";
import { useModel } from "@apparts/model";

type RouteConfig = {
  access: (request: unknown, me: unknown) => boolean;
  title: string;
  description: string;
};

const addCrud = ({
  prefix,
  app,
  model,
  routes,
  webtokenkey,
  trackChanges,
  idField = "id",
}: {
  prefix?: string;
  app: Application;
  model: ReturnType<typeof useModel>;
  routes: {
    get?: RouteConfig;
    getByIds?: RouteConfig;
    post?: RouteConfig;
    put?: RouteConfig;
    patch?: RouteConfig;
    delete?: RouteConfig;
  };
  webtokenkey: string;
  trackChanges?: (
    me: unknown,
    contentBefore: unknown,
    contentAfter: unknown
  ) => Promise<void>;
  idField?: string;
}) => {
  const methods = generateMethods(
    prefix,
    model,
    routes,
    webtokenkey,
    trackChanges,
    idField
  );

  Object.keys(methods).forEach((method) =>
    Object.keys(methods[method]).forEach((route) =>
      app[method](prefix + route, methods[method][route])
    )
  );
};

const generateMethods = (
  prefix,
  useModel,
  routes,
  webtokenkey,
  trackChanges,
  idField
) => {
  const res = { get: {}, post: {}, put: {}, patch: {}, delete: {} };
  if (routes.get) {
    res.get[""] = generateGet(prefix, useModel, routes.get, webtokenkey);
  }
  if (routes.getByIds) {
    res.get[`/:${idField}s`] = generateGetByIds(
      prefix,
      useModel,
      routes.getByIds,
      webtokenkey,
      idField
    );
  }
  if (routes.post) {
    res.post[""] = generatePost(
      prefix,
      useModel,
      routes.post,
      webtokenkey,
      trackChanges,
      idField
    );
  }
  if (routes.put) {
    res.put["/:" + idField] = generatePut(
      prefix,
      useModel,
      routes.put,
      webtokenkey,
      trackChanges,
      idField
    );
  }
  if (routes.patch) {
    res.patch["/:" + idField] = generatePatch(
      prefix,
      useModel,
      routes.patch,
      webtokenkey,
      trackChanges,
      idField
    );
  }
  if (routes.delete) {
    res.delete["/:" + idField + "s"] = generateDelete(
      prefix,
      useModel,
      routes.delete,
      webtokenkey,
      trackChanges,
      idField
    );
  }
  return res;
};

export { addCrud, generateMethods };
