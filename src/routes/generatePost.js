const {
  createParams,
  createBody,
  nameFromPrefix,
  reverseMap,
  checkAuth,
  createIdParam,
  makeSchema,
} = require("./common");
const {
  HttpError,
  prepauthTokenJWT,
  httpErrorSchema,
} = require("@apparts/prep");
const { DoesExist } = require("@apparts/model");

const generatePost = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey,
  trackChanges,
  idField
) => {
  if (!authF) {
    throw new Error(`Route (post) ${prefix} has no access control function.`);
  }

  const postF = prepauthTokenJWT(webtokenkey)(
    {
      title: title || "Create " + nameFromPrefix(prefix),
      description,

      receives: {
        params: makeSchema({
          ...createParams(prefix, useModel),
        }),
        body: makeSchema({
          ...createBody(prefix, useModel),
        }),
      },
      returns: [
        makeSchema({
          ...createIdParam(useModel, idField),
        }),
        httpErrorSchema(
          400,
          "Could not create item because your request had too many parameters"
        ),
        httpErrorSchema(412, "Could not create item because it exists"),
        httpErrorSchema(403, "You don't have the rights to retrieve this."),
      ],
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

      const { dbs, params } = req;
      let { body } = req;

      const [, One] = useModel(dbs);

      const types = One.getTypes();
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

      const model = new One({ ...body, ...params });
      try {
        await model.store();
      } catch (e) {
        if (e instanceof DoesExist) {
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
