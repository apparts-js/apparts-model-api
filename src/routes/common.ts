import * as types from "@apparts/types";
import { getModelSchema } from "@apparts/model";
import { traverseType, Type } from "@apparts/types";
import { Request } from "express";
import { InjectedParameters } from "./types";

export const typeFromModeltype = (tipe: Type) => {
  const res: {
    type?: string;
    semantic?: string;
    items?: Type;
    keys?: Record<string, Type>;
    values?: Type;
    value?: Type;
    optional?: boolean;
    alternatives?: Type[];
    default?: any;
  } = {};

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

  return res as Type;
};

export const validateModelIsCreatable = (
  pathParams: string[],
  types: Record<string, Type>
) => {
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

export const getPathParamKeys = (
  prefix: string,
  schema: types.Obj<any, any>,
  secondSchema: types.Obj<any, any>,
  includeBoth = false
) => {
  const types = { ...schema.getModelType(), ...secondSchema.getModelType() };
  const params = prefix
    .split("/")
    .filter((part) => part.substring(0, 1) === ":")
    .map((part) => part.slice(1))
    .filter((part) => !secondSchema.getModelType()[part] || includeBoth);
  for (const pathParam of params) {
    if (!types[pathParam]) {
      throw new Error(
        "Param " + pathParam + " not known in model for path " + prefix
      );
    }
  }
  return params;
};

export const createIdParam = (Model, idField) => {
  const types = getModelSchema(Model).getModelType();
  const idType = types[idField];
  return typeFromModeltype(idType);
};

export const createParams = (
  prefix: string,
  schema: types.Obj<any, any>,
  secondSchema: types.Obj<any, any>
) => {
  const typesObj = { ...schema.getModelType(), ...secondSchema.getModelType() };
  const pathParams = getPathParamKeys(prefix, schema, secondSchema, true);
  const paramTypes = {};
  for (const pathParam of pathParams) {
    const type = typesObj[pathParam];
    if (!("type" in type)) {
      throw new Error(
        `Path parameter "${pathParam}" in prefix "${prefix}" is a value type. This is not allowed.`
      );
    }
    paramTypes[pathParam] = { type: type.type };
  }
  for (const key in secondSchema.getModelType()) {
    if (!paramTypes[key]) {
      throw new Error(
        `Cannot ignore field "${key}" in path "${prefix}" because it does not exist in the path.`
      );
    }
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
    // hack
    return result as Type;
  });
};

export const createBody = (
  params: Record<string, { type: string }>,
  Model,
  ignoreKeys: string[]
) => {
  const types = getModelSchema(Model).getModelType();
  const bodyParams = {};
  for (const key in types) {
    const tipe = types[key];
    if (tipe.derived || ignoreKeys.includes(key)) {
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

export const nameFromPrefix = (prefix) => {
  if (prefix.substr(-1) === "/") {
    prefix = prefix.slice(0, -1);
  }
  return prefix
    .split("/")
    .reverse()[0]
    .replace(/^\w/, (c) => c.toUpperCase());
};

export const createReturns = (Model) => {
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

export class MappingError extends Error {
  constructor(message) {
    super(message);
    this.name = "MappingError";
  }
}

export const reverseMap = (collection, types, ignoreKeys: string[]) => {
  const unmappedKeys = Object.keys(collection);
  const mappedCollection = {};

  for (const key of unmappedKeys) {
    const mappedKey = Object.keys(types).filter(
      (t) => types[t].mapped === key
    )[0];
    if (mappedKey) {
      if (ignoreKeys.includes(mappedKey)) {
        throw new MappingError('"' + key + '" does not exist');
      }
      mappedCollection[mappedKey] = collection[key];
    } else if (!types[key] || types[key].mapped || ignoreKeys.includes(key)) {
      throw new MappingError('"' + key + '" does not exist');
    } else {
      mappedCollection[key] = collection[key];
    }
  }
  return mappedCollection;
};

export const unmapKey = (key, types) => {
  const mappedKey = Object.keys(types).filter(
    (t) => types[t].mapped === key
  )[0];
  if (mappedKey) {
    return mappedKey;
  } else if (!types[key] || types[key].mapped) {
    throw new MappingError('"' + key + '" does not exist');
  } else {
    return key;
  }
};

export const makeSchema = (type) =>
  ({
    getType() {
      return type;
    },
    getModelType() {
      return type;
    },
  } as types.Obj<any, any>);

export const getInjectedParamValues = async (
  injectParameters: InjectedParameters<any>,
  req: Request
) => {
  const injectedParamValues = {} as Record<string, any>;
  for (const key in injectParameters) {
    const fn = injectParameters[key];
    if (fn) {
      injectedParamValues[key] = await fn(req);
    }
  }
  return injectedParamValues;
};
