const { value } = require("@apparts/types");
const {
  createParams,
  nameFromPrefix,
  checkAuth,
  createIdParam,
  makeSchema,
} = require("./common");
const { IsReference } = require("@apparts/model");
const {
  prepauthTokenJWT,
  HttpError,
  httpErrorSchema,
} = require("@apparts/prep");

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
      title: title || "Delete " + nameFromPrefix(prefix),
      description,
      receives: {
        params: makeSchema({
          ...createParams(prefix, useModel),
          [idField + "s"]: {
            type: "array",
            items: createIdParam(useModel, idField),
          },
        }),
      },
      returns: [
        value("ok"),
        httpErrorSchema(403, "You don't have the rights to retrieve this."),
        httpErrorSchema(
          412,
          "Could not delete as other items reference this item"
        ),
      ],
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
      try {
        await res.deleteAll();
      } catch (e) {
        if (e instanceof IsReference) {
          return new HttpError(
            412,
            "Could not delete as other items reference this item"
          );
        }
        throw e;
      }
      trackChanges && (await trackChanges(me, res.contents, null));
      return "ok";
    }
  );
  return deleteF;
};

module.exports = generateDelete;
