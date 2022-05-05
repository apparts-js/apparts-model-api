const { typeFromModeltype } = require("../common");

const canBeOrdered = ({ type, alternatives, keys }, strict = false) => {
  if (type === "oneOf") {
    return alternatives.reduce((a, b) => a && canBeOrdered(b, true), true);
  }
  if (type === "object") {
    return !!keys && !strict;
  }
  return type !== "array";
};

const addToOrder = (order, tipe, name) => {
  const convertedType = typeFromModeltype(tipe);
  delete convertedType.optional;

  if (!canBeOrdered(tipe)) {
    return;
  }

  switch (tipe.type) {
    case "object":
      for (const key in tipe.keys) {
        const subtype = tipe.keys[key];
        addToOrder(order, subtype, name + "." + key);
      }
      break;
    case "array":
      break;
    default:
      order.items.keys.key.alternatives.push({
        value: name,
      });
  }
};

const createOrder = (useModel) => {
  const order = {
    optional: true,
    type: "array",
    items: {
      type: "object",
      keys: {
        key: {
          type: "oneOf",
          alternatives: [],
        },
        dir: {
          type: "oneOf",
          alternatives: [{ value: "ASC" }, { value: "DESC" }],
        },
      },
    },
  };
  const [Models] = useModel();
  const types = Models.getTypes();
  for (const key in types) {
    const tipe = types[key];

    if (tipe.type === "array" || (tipe.type === "object" && !tipe.keys)) {
      continue;
    }
    let name = key;
    if (tipe.public && !tipe.derived) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }

      addToOrder(order, tipe, name);
    }
  }
  return order;
};

module.exports = { createOrder };
