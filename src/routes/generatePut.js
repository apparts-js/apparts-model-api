const {
  createParams,
  nameFromPrefix,
  reverseMap,
  createBody,
  checkAuth,
  createIdParam,
  makeSchema,
} = require("./common");
const {
  HttpError,
  prepauthTokenJWT,
  httpErrorSchema,
} = require("@apparts/prep");
const { NotFound } = require("@apparts/model");

const generatePut = (
  prefix,
  Model,
  { access: authF, title, description },
  webtokenkey,
  trackChanges,
  idField
) => {
  if (!authF) {
    throw new Error(`Route (put) ${prefix} has no access control function.`);
  }
  const putF = prepauthTokenJWT(webtokenkey)(
    {
      title: title || "Alter " + nameFromPrefix(prefix),
      description,
      receives: {
        params: makeSchema({
          ...createParams(prefix, Model),
          [idField]: createIdParam(Model, idField),
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
          "Could not alter item because your request had too many parameters"
        ),
        httpErrorSchema(
          400,
          "Could not alter item because it would change a path id"
        ),
        httpErrorSchema(404, nameFromPrefix(prefix) + " not found"),
        httpErrorSchema(403, "You don't have the rights to retrieve this."),
      ],
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

      const { dbs, params } = req;
      let { body } = req;

      const types = Model.getSchema().getModelType();

      try {
        body = reverseMap(body, types);
      } catch (e) {
        if (e instanceof HttpError) {
          return new HttpError(
            400,
            "Could not alter item because your request had too many parameters",
            e.message.error
          );
        }
        throw e;
      }

      for (const key of Object.keys(body)) {
        if (!types[key] || !types[key].public || types[key].auto) {
          return new HttpError(
            400,
            "Could not alter item because your request had too many parameters",
            `"${key}" does not exist`
          );
        }
      }

      const optionalsToBeRemoved = {};
      Object.keys(types)
        .filter(
          (key) =>
            !(key in body) &&
            types[key].public &&
            !types[key].readOnly &&
            (types[key].optional || types[key].default !== undefined)
        )
        .forEach((key) => {
          optionalsToBeRemoved[key] = null;
        });

      const paramOverlap = Object.keys(body)
        .filter((key) => params[key])
        .filter((key) => body[key] !== params[key]);
      if (paramOverlap.length > 0) {
        return new HttpError(
          400,
          "Could not alter item because it would change a path id",
          JSON.stringify(paramOverlap)
        );
      }

      let model;
      try {
        model = await new Model(dbs).loadOne(params);
      } catch (e) {
        if (e instanceof NotFound) {
          return new HttpError(404, nameFromPrefix(prefix) + " not found");
        }
        throw e;
      }
      const contentBefore = model.content;
      model.content = {
        ...model.content,
        ...body,
        ...optionalsToBeRemoved,
        ...params,
      };

      Object.keys(types)
        .filter(
          (key) =>
            !(key in body) &&
            types[key].public &&
            !types[key].readOnly &&
            types[key].default !== undefined
        )
        .forEach((key) => {
          model.content = model.getDefaults([model.content], key)[0];
        });
      await model.update();
      trackChanges && (await trackChanges(me, contentBefore, model.content));
      return model.content[idField];
    }
  );
  return putF;
};

module.exports = generatePut;
