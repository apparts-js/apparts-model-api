const {
  createParams,
  nameFromPrefix,
  createReturns,
  reverseMap,
  checkAuth,
  typeFromModeltype,
  unmapKey,
} = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

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
        const convertedType = typeFromModeltype(tipe);
        delete convertedType.optional;
        filter.keys[name] = {
          type: "oneOf",
          alternatives: [convertedType],
          optional: true,
        };
        if (tipe.type === "string") {
          filter.keys[name].alternatives.push({
            type: "object",
            keys: {
              like: { type: "string" },
            },
          });
        }
        if (
          tipe.type === "int" ||
          tipe.type === "float" ||
          tipe.type === "time"
        ) {
          filter.keys[name].alternatives.push({
            type: "object",
            keys: {
              gt: { type: tipe.type, optional: true },
              gte: { type: tipe.type, optional: true },
              lt: { type: tipe.type, optional: true },
              lte: { type: tipe.type, optional: true },
            },
          });
        }
      }
    }
  }
  return filter;
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

    if (tipe.type === "object" || tipe.type === "array") {
      continue;
    }

    let name = key;
    if (tipe.public && !tipe.derived) {
      if (tipe.mapped) {
        name = tipe.mapped;
      }
      const convertedType = typeFromModeltype(tipe);
      delete convertedType.optional;
      order.items.keys.key.alternatives.push({
        value: name,
      });
    }
  }
  return order;
};

const generateGet = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey
) => {
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      query: {
        limit: { type: "int", default: 50 },
        offset: { type: "int", default: 0 },
        order: createOrder(useModel),
        filter: createFilter(prefix, useModel),
      },
      params: createParams(prefix, useModel),
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

      const {
        dbs,
        query: { limit, offset },
        params,
      } = req;
      let { filter, order } = req.query;

      const [Many] = useModel(dbs);
      if (filter) {
        const types = Many.getTypes();
        filter = reverseMap(filter, types);
        for (const key in filter) {
          if (typeof filter[key] === "object") {
            const operants = Object.keys(filter[key]);
            if (operants.length >= 2) {
              filter[key] = {
                op: "and",
                val: operants.map((op) => ({ op, val: filter[key][op] })),
              };
            } else if (operants.length === 1) {
              const op = operants[0];
              filter[key] = { op, val: filter[key][op] };
            } else {
              delete filter[key];
            }
          }
        }
      }

      if (order) {
        const types = Many.getTypes();
        order = order.map(({ dir, key }) => ({
          dir,
          key: unmapKey(key, types),
        }));
      }
      const res = new Many();
      await res.load({ ...filter, ...params }, limit, offset, order);
      await res.generateDerived();
      return res.getPublic();
    },
    {
      title: title || "Get " + nameFromPrefix(prefix),
      description,
      returns: [
        {
          status: 200,
          type: "array",
          items: {
            type: "object",
            keys: createReturns(useModel),
          },
        },
        { status: 403, error: "You don't have the rights to retrieve this." },
      ],
    }
  );
  return getF;
};

module.exports = generateGet;
module.exports.createFilter = createFilter;
module.exports.createOrder = createOrder;
