const {
  createParams,
  nameFromPrefix,
  createReturns,
  createIdParam,
  makeSchema,
} = require("./common");
const { prepare } = require("@apparts/prep");

const generateGetByIds = (
  prefix,
  Model,
  { hasAccess: authF, title, description },
  idField
) => {
  if (!authF) {
    throw new Error(
      `Route (getByIds) ${prefix} has no access control function.`
    );
  }
  const getF = prepare(
    {
      title: title || "Get " + nameFromPrefix(prefix) + " by Ids",
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...createParams(prefix, Model),
          [idField + "s"]: {
            type: "array",
            items: createIdParam(Model, idField),
          },
        }),
      },
      returns: [
        makeSchema({
          type: "array",
          items: {
            type: "object",
            keys: createReturns(Model),
          },
        }),
      ],
    },
    async (req) => {
      const {
        dbs,
        params: { [idField + "s"]: ids, ...restParams },
      } = req;

      if (ids.length === 0) {
        return [];
      }

      const res = new Model(dbs);
      await res.load({ [idField]: { op: "in", val: ids }, ...restParams });
      return await res.getPublic();
    }
  );
  return getF;
};

module.exports = generateGetByIds;
