const { HttpError } = require("@apparts/error");

const checkAuth = async (authF, res, me) => {
  if (!authF) {
    throw new Error("Route without auth func found!");
  }
  const allowed = await authF(res, me);
  if (!allowed) {
    throw new HttpError(403, "You don't have the rights to retrieve this.");
  }
};

const typeFromModeltype = (tipe) => {
  const res = {
    type: tipe.type,
  };

  if (tipe.items) {
    res.items = tipe.items;
  }
  if (tipe.keys) {
    res.keys = tipe.keys;
  }
  if (tipe.values) {
    res.values = tipe.values;
  }
  if (tipe.value) {
    res.value = tipe.value;
  }
  if (tipe.optional) {
    res.optional = tipe.optional;
  }
  if (tipe.alternatives) {
    res.alternatives = tipe.alternatives;
  }

  return res;
};

const createIdParam = (useModel, idField) => {
  const [Models] = useModel();
  const idType = Models.getTypes()[idField];
  return typeFromModeltype(idType);
};

const createParams = (prefix, useModel) => {
  const [Models] = useModel();
  const pathParams = prefix
    .split("/")
    .filter((part) => part.substr(0, 1) === ":")
    .map((part) => part.slice(1));
  const paramTypes = {};
  for (const pathParam of pathParams) {
    if (!Models.getTypes()[pathParam]) {
      throw "Param " + pathParam + " not known in model for path " + prefix;
    }
    paramTypes[pathParam] = {
      type: Models.getTypes()[pathParam].type,
    };
  }
  return paramTypes;
};

const createBody = (prefix, useModel) => {
  const params = createParams(prefix, useModel);
  const [Models] = useModel();
  const bodyParams = {};
  const types = Models.getTypes();
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
        bodyParams[name] = typeFromModeltype(tipe);
        if (tipe.optional === true || tipe.default !== undefined) {
          bodyParams[name].optional = true;
        }
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

const createReturns = (useModel) => {
  const [Models] = useModel();
  const returns = {};
  const types = Models.getTypes();
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

module.exports = {
  createParams,
  createBody,
  checkAuth,
  nameFromPrefix,
  createReturns,
  reverseMap,
  typeFromModeltype,
  unmapKey,
  createIdParam,
};
