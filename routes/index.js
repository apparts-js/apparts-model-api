const generateGet = require("./generateGet");
const generateGetByIds = require("./generateGetByIds");
const generatePost = require("./generatePost");
const generatePut = require("./generatePut");
const generatePatch = require("./generatePatch");
const generateDelete = require("./generateDelete");

const addCrud = ({
  prefix,
  app,
  model,
  routes,
  webtokenkey,
  trackChanges,
  idField = "id",
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

module.exports = { addCrud, generateMethods };
