const {
  createParams,
  nameFromPrefix,
  createReturns,
  checkAuth,
  createIdParam,
  makeSchema,
} = require("./common");
const { prepauthTokenJWT, httpErrorSchema } = require("@apparts/prep");

const generateGetByIds = (
  prefix,
  Model,
  { access: authF, title, description },
  webtokenkey,
  idField
) => {
  if (!authF) {
    throw new Error(
      `Route (getByIds) ${prefix} has no access control function.`
    );
  }
  const getF = prepauthTokenJWT(webtokenkey)(
    {
      title: title || "Get " + nameFromPrefix(prefix) + " by Ids",
      description,
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
        httpErrorSchema(403, "You don't have the rights to retrieve this."),
      ],
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

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
