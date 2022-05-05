const { createParams, typeFromModeltype } = require("../common");

const canBeFiltered = ({ type, alternatives, keys }, strict = false) => {
  if (type === "oneOf") {
    return alternatives.reduce((a, b) => a && canBeFiltered(b, true), true);
  }
  if (type === "object") {
    return !!keys && !strict;
  }
  return type !== "array";
};

const addBaseTypeFilter = (filter, tipes, name) => {
  filter.keys[name] = {
    type: "oneOf",
    alternatives: tipes,
    optional: true,
  };
};

const addToFilter = (filter, tipe, name) => {
  const convertedType = typeFromModeltype(tipe);
  delete convertedType.optional;

  if (!canBeFiltered(tipe)) {
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
      addBaseTypeFilter(filter, tipe.alternatives, name);
      break;
    case "string":
      addBaseTypeFilter(filter, [convertedType], name);
      filter.keys[name].alternatives.push({
        type: "object",
        keys: {
          like: { type: "string" },
        },
      });
      break;
    case "int":
    case "float":
    case "time":
      addBaseTypeFilter(filter, [convertedType], name);
      filter.keys[name].alternatives.push({
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
      addBaseTypeFilter(filter, [convertedType], name);
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
  return filter;
};

module.exports = { createFilter };
