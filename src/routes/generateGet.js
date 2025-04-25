const {
  createParams,
  nameFromPrefix,
  createReturns,
  reverseMap,
  unmapKey,
  makeSchema,
} = require("./common");
const { prepare } = require("@apparts/prep");

const { createFilter } = require("./get/createFilter");
const { createOrder } = require("./get/createOrder");

const getTypeOfDottedPath = (path, type) => {
  if (path.length === 0) {
    return type.type;
  }
  const [first, ...rest] = path;
  return getTypeOfDottedPath(rest, type.keys[first]);
};

const typeToJSType = (type) => {
  switch (type) {
    case "id":
    case "int":
    case "float":
      return "number";
    case "boolean":
    case "bool":
      return "boolean";
    default:
      return "string";
  }
};

const generateGet = (
  prefix,
  Model,
  { hasAccess: authF, title, description }
) => {
  if (!authF) {
    throw new Error(`Route (get) ${prefix} has no access control function.`);
  }
  const getF = prepare(
    {
      title: title || "Get " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        query: makeSchema({
          limit: { type: "int", default: 50 },
          offset: { type: "int", default: 0 },
          order: createOrder(Model),
          filter: createFilter(prefix, Model),
        }),
        params: makeSchema(createParams(prefix, Model)),
      },
      returns: [
        makeSchema({
          type: "object",
          keys: {
            data: {
              type: "array",
              items: {
                type: "object",
                keys: createReturns(Model),
              },
            },
            total: { type: "int" },
          },
        }),
      ],
    },
    async (req) => {
      const {
        dbs,
        query: { limit, offset },
        params,
      } = req;
      let { filter, order } = req.query;

      if (filter) {
        const types = Model.getSchema().getModelType();
        for (const key in filter) {
          if (filter[key] === null) {
            delete filter[key];
            continue;
          }

          if (
            typeof filter[key] === "object" &&
            !Array.isArray(filter[key]) &&
            filter[key] !== null
          ) {
            const operants = Object.keys(filter[key]);
            const [first, ...path] = key.split(".");
            let mappedOperants = operants.map((op) => ({
              op,
              val: filter[key][op],
            }));
            if (path.length > 0) {
              delete filter[key];
              const convertedType = { keys: types };
              const valType = getTypeOfDottedPath(
                [first, ...path],
                convertedType
              );
              mappedOperants = mappedOperants.map((op) => ({
                op: "of",
                val: {
                  path,
                  cast: typeToJSType(valType),
                  value: op,
                },
              }));
            }
            if (operants.length === 0) {
              delete filter[key];
              continue;
            }
            if (operants.length >= 2) {
              filter[first] = {
                op: "and",
                val: mappedOperants,
              };
            } else if (operants.length === 1) {
              filter[first] = mappedOperants[0];
            }
          }
        }
        filter = reverseMap(filter, types);
      }

      if (order) {
        const types = Model.getSchema().getModelType();
        order = order.map(({ dir, key }) => {
          const [first, ...path] = key.split(".");
          return {
            dir,
            path: path.length >= 1 ? path : undefined,
            key: unmapKey(first, types),
          };
        });
      }
      const res = new Model(dbs);
      await res.load({ ...filter, ...params }, limit, offset, order);
      let total = await res.contents.length;
      if (offset || total === limit) {
        total = await res.count({ ...filter, ...params });
      }
      return {
        data: await res.getPublic(),
        total,
      };
    }
  );
  return getF;
};

module.exports = generateGet;
