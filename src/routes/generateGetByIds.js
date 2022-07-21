const {
  createParams,
  nameFromPrefix,
  createReturns,
  checkAuth,
  createIdParam,
} = require("./common");
const { prepauthTokenJWT } = require("@apparts/types");

const generateGetByIds = (
  prefix,
  useModel,
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
      params: {
        ...createParams(prefix, useModel),
        [idField + "s"]: {
          type: "array",
          items: createIdParam(useModel, idField),
        },
      },
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

      const [Many] = useModel(dbs);
      const res = new Many();
      await res.load({ [idField]: { op: "in", val: ids }, ...restParams });
      await res.generateDerived();
      return res.getPublic();
    },
    {
      title: title || "Get " + nameFromPrefix(prefix) + " by Ids",
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

module.exports = generateGetByIds;
