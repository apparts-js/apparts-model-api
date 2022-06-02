const { createParams, typeFromModeltype } = require("../common");

const canBeFiltered = ({ type, alternatives, keys }, strict = false) => {
  if (type === "oneOf") {
    return alternatives.reduce((a, b) => a && canBeFiltered(b, true), true);
  }
  if (type === "object") {
    return !!keys && !strict;
  }
  return type !== "array" && (strict || type !== undefined);
};

const addToFilter = (filter, tipe, name) => {
  const convertedType = typeFromModeltype(tipe);
  delete convertedType.optional;

  const typeCanBeFiltered = canBeFiltered(tipe);

  if (!tipe.optional && !typeCanBeFiltered) {
    return;
  }
  filter.keys[name] = {
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
    case "oneOf":
      filterList.push(...tipe.alternatives);
      break;
    case "string":
      filterList.push(convertedType, {
        type: "object",
        keys: {
          like: { type: "string" },
        },
      });
      break;
    case "int":
    case "float":
    case "time":
      filterList.push(convertedType, {
        type: "object",
        keys: {
          gt: { type: tipe.type, optional: true },
          gte: { type: tipe.type, optional: true },
          lt: { type: tipe.type, optional: true },
          lte: { type: tipe.type, optional: true },
        },
      });
      break;
    default:
      filterList.push(convertedType);
  }
};

const createFilter = (prefix, useModel) => {
  const filter = { optional: true, type: "object", keys: {} };
  const [Models] = useModel();
  const types = Models.getTypes();
  const params = createParams(prefix, useModel);
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

module.exports = { createFilter };
