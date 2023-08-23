const {
  createParams,
  createBody,
  nameFromPrefix,
  reverseMap,
  createIdParam,
  makeSchema,
  validateModelIsCreatable,
  getPathParamKeys,
} = require("./common");
const { HttpError, prepare, httpErrorSchema } = require("@apparts/prep");
const { NotUnique } = require("@apparts/model");

const generatePost = (
  prefix,
  Model,
  { hasAccess: authF, title, description },
  trackChanges,
  idField
) => {
  if (!authF) {
    throw new Error(`Route (post) ${prefix} has no access control function.`);
  }

  const types = Model.getSchema().getModelType();
  const pathParamKeys = getPathParamKeys(prefix, types);
  validateModelIsCreatable([...pathParamKeys, idField], types);

  const postF = prepare(
    {
      title: title || "Create " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...createParams(prefix, Model),
        }),
        body: makeSchema({
          ...createBody(prefix, Model),
        }),
      },
      returns: [
        makeSchema({
          ...createIdParam(Model, idField),
        }),
        httpErrorSchema(
          400,
          "Could not create item because your request had too many parameters"
        ),
        httpErrorSchema(412, "Could not create item because it exists"),
      ],
    },
    async (req, res, me) => {
      const { dbs, params } = req;
      let { body } = req;

      try {
        body = reverseMap(body, types);
      } catch (e) {
        if (e instanceof HttpError) {
          return new HttpError(
            400,
            "Could not create item because your request had too many parameters",
            e.message.error
          );
        }
        throw e;
      }

      for (const key of Object.keys(body)) {
        if (!types[key] || !types[key].public || types[key].auto) {
          return new HttpError(
            400,
            "Could not create item because your request had too many parameters",
            `"${key}" does not exist`
          );
        }
      }

      const model = new Model(dbs, [{ ...body, ...params }]);
      try {
        await model.store();
      } catch (e) {
        if (e instanceof NotUnique) {
          return new HttpError(412, "Could not create item because it exists");
        }
        throw e;
      }

      trackChanges && (await trackChanges(me, null, model.content));
      return model.content[idField];
    }
  );
  return postF;
};

module.exports = generatePost;
