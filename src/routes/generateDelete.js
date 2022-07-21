const {
  createParams,
  nameFromPrefix,
  checkAuth,
  createIdParam,
} = require("./common");
const { IsReference } = require("@apparts/model");
const { HttpError, fromThrows } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");

const generateDelete = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey,
  trackChanges,
  idField
) => {
  if (!authF) {
    throw new Error(`Route (delete) ${prefix} has no access control function.`);
  }
  const deleteF = prepauthTokenJWT(webtokenkey)(
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
        return "ok";
      }

      const [Many] = useModel(dbs);
      const res = new Many();
      await res.load({ [idField]: { op: "in", val: ids }, ...restParams });
      await fromThrows(
        () => res.deleteAll(),
        IsReference,
        () =>
          new HttpError(
            412,
            "Could not delete as other items reference this item"
          )
      );
      trackChanges && (await trackChanges(me, res.contents, null));
      return "ok";
    },
    {
      title: title || "Delete " + nameFromPrefix(prefix),
      description,
      returns: [
        { status: 200, value: "ok" },
        { status: 403, error: "You don't have the rights to retrieve this." },
        {
          status: 412,
          error: "Could not delete as other items reference this item",
        },
      ],
    }
  );
  return deleteF;
};

module.exports = generateDelete;
