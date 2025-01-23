import { getModelSchema } from "@apparts/model";
const { traverseType } = require("@apparts/types");
const { HttpError } = require("@apparts/prep");

const typeFromModeltype = (tipe) => {
  const res = {};

  if ("type" in tipe) {
    res.type = tipe.type;
  }
  if ("semantic" in tipe) {
    res.semantic = tipe.semantic;
  }
  if ("items" in tipe) {
    res.items = tipe.items;
  }
  if ("keys" in tipe) {
    res.keys = tipe.keys;
  }
  if ("values" in tipe) {
    res.values = tipe.values;
  }
  if ("value" in tipe) {
    res.value = tipe.value;
  }
  if ("optional" in tipe) {
    res.optional = tipe.optional;
  }
  if ("alternatives" in tipe) {
    res.alternatives = tipe.alternatives;
  }

  return res;
};

const validateModelIsCreatable = (pathParams, types) => {
  for (const key in types) {
    const tipe = types[key];
    if (
      (!tipe.public || tipe.auto || tipe.readOnly) &&
      !tipe.default &&
      !tipe.derived &&
      !tipe.optional &&
      pathParams.indexOf(key) === -1
    ) {
      throw new Error(
        "Model has key that are not public and not in the path but have to be created: " +
          key
      );
    }
  }
};

const getPathParamKeys = (prefix, types) => {
  const params = prefix
    .split("/")
    .filter((part) => part.substr(0, 1) === ":")
    .map((part) => part.slice(1));
  for (const pathParam of params) {
    if (!types[pathParam]) {
      throw new Error(
        "Param " + pathParam + " not known in model for path " + prefix
      );
    }
  }
  return params;
};

const createIdParam = (Model, idField) => {
  const types = getModelSchema(Model).getModelType();
  const idType = types[idField];
  return typeFromModeltype(idType);
};

const createParams = (prefix, Model) => {
  const types = getModelSchema(Model).getModelType();
  const pathParams = getPathParamKeys(prefix, types);
  const paramTypes = {};
  for (const pathParam of pathParams) {
    paramTypes[pathParam] = {
      type: types[pathParam].type,
    };
  }
  return paramTypes;
};

const recursiveCreateBody = (tipe) => {
  return traverseType(tipe, (tipe) => {
    if (tipe.readOnly) {
      return undefined;
    }
    const result = typeFromModeltype(tipe);
    if ("default" in tipe) {
      result.default = tipe.default;
    }
    return result;
  });
};

const createBody = (prefix, Model) => {
  const params = createParams(prefix, Model);
  const types = getModelSchema(Model).getModelType();
  const bodyParams = {};
  for (const key in types) {
    const tipe = types[key];
    if (tipe.derived) {
      continue;
    }
    let name = key;
    if (tipe.public && !tipe.auto && !tipe.readOnly) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      if (!params[key]) {
        bodyParams[name] = recursiveCreateBody(tipe);
      }
    }
  }
  return bodyParams;
};

const nameFromPrefix = (prefix) => {
  if (prefix.substr(-1) === "/") {
    prefix = prefix.slice(0, -1);
  }
  return prefix
    .split("/")
    .reverse()[0]
    .replace(/^\w/, (c) => c.toUpperCase());
};

const createReturns = (Model) => {
  const types = getModelSchema(Model).getModelType();
  const returns = {};

  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      returns[name] = typeFromModeltype(tipe);
      if (tipe.optional) {
        returns[name].optional = true;
      }
    }
  }
  return returns;
};

const reverseMap = (collection, types) => {
  const unmappedKeys = Object.keys(collection);
  const mappedCollection = {};

  for (const key of unmappedKeys) {
    const mappedKey = Object.keys(types).filter(
      (t) => types[t].mapped === key
    )[0];
    if (mappedKey) {
      mappedCollection[mappedKey] = collection[key];
    } else if (!types[key] || types[key].mapped) {
      throw new HttpError(400, '"' + key + '" does not exist');
    } else {
      mappedCollection[key] = collection[key];
    }
  }
  return mappedCollection;
};

const unmapKey = (key, types) => {
  const mappedKey = Object.keys(types).filter(
    (t) => types[t].mapped === key
  )[0];
  if (mappedKey) {
    return mappedKey;
  } else if (!types[key] || types[key].mapped) {
    throw new HttpError(400, '"' + key + '" does not exist');
  } else {
    return key;
  }
};

const makeSchema = (type) => ({
  getType() {
    return type;
  },
  getModelType() {
    return type;
  },
});

module.exports = {
  makeSchema,
  createParams,
  createBody,
  nameFromPrefix,
  createReturns,
  reverseMap,
  typeFromModeltype,
  unmapKey,
  createIdParam,
  getPathParamKeys,
  validateModelIsCreatable,
};
