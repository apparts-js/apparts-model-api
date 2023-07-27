const { value } = require("@apparts/types");
const {
  createParams,
  nameFromPrefix,
  createIdParam,
  makeSchema,
} = require("./common");
const { IsReference } = require("@apparts/model");
const { prepare, HttpError, httpErrorSchema } = require("@apparts/prep");

const generateDelete = (
  prefix,
  Model,
  { hasAccess: authF, title, description },
  trackChanges,
  idField
) => {
  if (!authF) {
    throw new Error(`Route (delete) ${prefix} has no access control function.`);
  }
  const deleteF = prepare(
    {
      title: title || "Delete " + nameFromPrefix(prefix),
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
        value("ok"),
        httpErrorSchema(
          412,
          "Could not delete as other items reference this item"
        ),
      ],
    },
    async (req, _, me) => {
      const {
        dbs,
        params: { [idField + "s"]: ids, ...restParams },
      } = req;

      if (ids.length === 0) {
        return "ok";
      }

      const res = new Model(dbs);
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
