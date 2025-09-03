import * as types from "@apparts/types";
import { createParams } from "../common";

export const collectTypes = (tipe: Record<string, types.Type>) => {
  const types = {} as Record<string, types.Type[]>;

  for (const key in tipe) {
    const name = tipe[key].mapped || key;
    types[name] = [] as types.Type[];
    const subType = tipe[key];
    if ("value" in subType) {
      types[name].push(subType);
      continue;
    }
    switch (subType.type) {
      case "object":
        if ("keys" in subType) {
          const subTypes = collectTypes(subType.keys);
          for (const subKey in subTypes) {
            types[name + "." + subKey] = types[name + "." + subKey] || [];
            types[name + "." + subKey].push(...subTypes[subKey]);
          }
        }
        break;
      case "oneOf": {
        const alternatives = subType.alternatives;
        for (const alternative of alternatives) {
          const subTypes = collectTypes({ "": alternative });
          for (const subKey in subTypes) {
            types[name + subKey] = types[name + subKey] || [];
            types[name + subKey].push(...subTypes[subKey]);
          }
        }
        break;
      }
      case "array":
        break;
      default:
        types[name].push(subType);
        break;
    }
    if (types[name].length === 0) {
      delete types[name];
    }
  }
  return types;
};

const getFilterTypeFromType = (type: types.Type) => {
  if ("value" in type) {
    return "value" as const;
  }
  switch (type.type) {
    case "int":
    case "float":
    case "time":
    case "date":
    case "daytime":
      return "number" as const;
    case "boolean":
      return "boolean" as const;
    default:
      return "string" as const;
  }
};

const addToFilter = (
  filter: types.ObjType,
  collectedTypes: Record<string, types.Type[]>,
  name: string
) => {
  const filterList = [] as types.Type[];
  for (const key in collectedTypes) {
    if (key !== name && !key.startsWith(name + ".")) {
      continue;
    }

    const filterTypes = collectedTypes[key].map(getFilterTypeFromType);
    const hasStringType = filterTypes.includes("string");
    const hasNumberType = filterTypes.includes("number");
    const hasBooleanType = filterTypes.includes("boolean");
    const hasValueTypes = filterTypes.filter((t) => t === "value").length > 1;
    const isOptionalType =
      collectedTypes[key].filter((t) => t.optional).length > 0;

    if (isOptionalType) {
      filterList.push(
        types
          .obj({
            exists: types.boolean(),
          })
          .getType()
      );
    }
    if (hasStringType) {
      filterList.push(
        types.string().getType(),
        types.array(types.string()).getType(),
        types
          .obj({
            like: types.string().optional(),
            ilike: types.string().optional(),
          })
          .getType()
      );
    }
    if (hasNumberType) {
      filterList.push(
        types.float().getType(),
        types.array(types.float()).getType(),
        types
          .obj({
            gt: types.int().optional(),
            gte: types.int().optional(),
            lt: types.int().optional(),
            lte: types.int().optional(),
          })
          .getType()
      );
    }
    if (hasBooleanType) {
      filterList.push(types.boolean().getType());
    }
    if (hasValueTypes) {
      const oneOf = types.array(types.oneOf([])).getType();
      ((oneOf as types.ArrayType).items as types.OneOfType).alternatives =
        collectedTypes[key].filter((t) => "value" in t);
      filterList.push(oneOf);
    }

    if (filterList.length === 0) {
      return;
    }
    filter.keys[key] = filter.keys[key] || {
      type: "oneOf",
      alternatives: [],
      optional: true,
    };

    (filter.keys[key] as types.OneOfType).alternatives.push(...filterList);
    filterList.length = 0; // Clear the filterList for the next iteration
  }
};

export const createFilter = (
  params: Record<string, { type: string }>,
  schema: types.Obj<any, any>,
  ignoreKeys: string[]
) => {
  const filter = { optional: true as const, type: "object" as const, keys: {} };
  const types = schema.getModelType();
  const collectedTypes = collectTypes(schema.getModelType());
  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public && !tipe.derived && !ignoreKeys.includes(key)) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      if (!params[key]) {
        addToFilter(filter, collectedTypes, name);
      }
    }
  }
  for (const key in filter.keys) {
    if (filter.keys[key].alternatives.length === 0) {
      delete filter.keys[key];
    }
  }
  return filter;
};
