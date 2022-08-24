const {
  createParams,
  nameFromPrefix,
  createReturns,
  reverseMap,
  checkAuth,
  unmapKey,
} = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

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
  useModel,
  { access: authF, title, description },
  webtokenkey
) => {
  if (!authF) {
    throw new Error(`Route (get) ${prefix} has no access control function.`);
  }
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
        const types = Many.getTypes();
        order = order.map(({ dir, key }) => {
          const [first, ...path] = key.split(".");
          return {
            dir,
            path: path.length >= 1 ? path : undefined,
            key: unmapKey(first, types),
          };
        });
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
