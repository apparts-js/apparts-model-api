import { getModelSchema } from "@apparts/model";
import { createParams, typeFromModeltype } from "../common";

const canBeFiltered = ({ type, alternatives, keys }, strict = false) => {
  if (type === "oneOf") {
    return alternatives.reduce((a, b) => a && canBeFiltered(b), true);
  }
  if (type === "object") {
    return !!keys && !strict;
  }
  return type !== "array";
};

const addToFilter = (filter, tipe, name, noMultiSelect = false) => {
  const convertedType = typeFromModeltype(tipe);
  delete convertedType.optional;

  const typeCanBeFiltered = canBeFiltered(tipe);

  if (!tipe.optional && !typeCanBeFiltered) {
    return;
  }
  filter.keys[name] = filter.keys[name] || {
    type: "oneOf",
    alternatives: [],
    optional: true,
  };
  const filterList = filter.keys[name].alternatives;

  if (tipe.optional) {
    filterList.push({
      type: "object",
      keys: {
        exists: { type: "boolean" },
      },
    });
  }

  if (!typeCanBeFiltered) {
    return;
  }

  switch (tipe.type) {
    case "object":
      for (const key in tipe.keys) {
        const subtype = tipe.keys[key];
        addToFilter(filter, subtype, name + "." + key);
      }
      break;
    case "oneOf": {
      const arrayItems = [] as ReturnType<typeof typeFromModeltype>[];
      for (const alternative of tipe.alternatives) {
        addToFilter(filter, alternative, name, true);
        const convertedType = typeFromModeltype(alternative);
        delete convertedType.optional;
        if (
          convertedType.type !== "object" &&
          convertedType.type !== "oneOf" &&
          convertedType.type !== "array" &&
          convertedType.type !== "objValues"
        ) {
          arrayItems.push(convertedType);
        }
      }
      filterList.push({
        type: "array",
        items: {
          type: "oneOf",
          alternatives: arrayItems,
        },
      });
      break;
    }
    case "string":
      if (!noMultiSelect) {
        filterList.push({ type: "array", items: convertedType });
      }

      filterList.push(convertedType, {
        type: "object",
        keys: {
          like: { type: "string", optional: true },
          ilike: { type: "string", optional: true },
        },
      });
      break;
    case "int":
    case "float":
    case "time":
      if (!noMultiSelect) {
        filterList.push({ type: "array", items: convertedType });
      }

      if (tipe.semantic !== "id") {
        filterList.push(convertedType, {
          type: "object",
          keys: {
            gt: { type: tipe.type, optional: true },
            gte: { type: tipe.type, optional: true },
            lt: { type: tipe.type, optional: true },
            lte: { type: tipe.type, optional: true },
          },
        });
      } else {
        filterList.push(convertedType);
      }
      break;
    case undefined: // value
      filterList.push(convertedType);
      break;
    default:
      if (!noMultiSelect) {
        filterList.push({ type: "array", items: convertedType });
      }
      filterList.push(convertedType);
  }
};

export const createFilter = (prefix, Model) => {
  const filter = { optional: true, type: "object", keys: {} };
  const types = getModelSchema(Model).getModelType();
  const params = createParams(prefix, Model);
  for (const key in types) {
    const tipe = types[key];
    let name = key;
    if (tipe.public && !tipe.derived) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      if (!params[key]) {
        addToFilter(filter, tipe, name);
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
