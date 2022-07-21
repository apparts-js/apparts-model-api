const {
  createParams,
  nameFromPrefix,
  reverseMap,
  createBody,
  checkAuth,
  createIdParam,
} = require("./common");
const { HttpError, fromThrows } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");
const { NotFound } = require("@apparts/model");

const makePatchBody = (types) => {
  for (const key in types) {
    const type = types[key];
    if (type.optional) {
      const subType = type;
      delete subType.optional;
      delete subType.public;
      types[key] = {
        type: "oneOf",
        optional: true,
        alternatives: [subType, { type: "null" }],
      };
    } else {
      type.optional = true;
    }
  }
  return types;
};

const generatePatch = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey,
  trackChanges,
  idField
) => {
  if (!authF) {
    throw new Error(`Route (patch) ${prefix} has no access control function.`);
  }

  const patchF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
        [idField]: createIdParam(useModel, idField),
      },
      body: {
        ...makePatchBody(createBody(prefix, useModel)),
      },
    },
    async (req, me) => {
      await checkAuth(authF, req, me);

      const { dbs, params } = req;
      let { body } = req;
      const [, One] = useModel(dbs);

      const types = One.getTypes();
      body = await fromThrows(
        () => reverseMap(body, types),
        HttpError,
        (e) =>
          new HttpError(
            400,
            "Could not alter item because your request had too many parameters",
            e.message
          )
      );

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
            body[key] === null && types[key].public && types[key].optional
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
          paramOverlap
        );
      }

      const model = await fromThrows(
        () => new One().load(params),
        NotFound,
        () => HttpError.notFound(nameFromPrefix(prefix))
      );
      const contentBefore = model.content;
      model.content = { ...model.content, ...body, ...optionalsToBeRemoved };
      await model.update();
      trackChanges && (await trackChanges(me, contentBefore, model.content));
      return model.content[idField];
    },
    {
      title: title || "Patch " + nameFromPrefix(prefix),
      description,
      returns: [
        {
          status: 200,
          ...createIdParam(useModel, idField),
        },
        {
          status: 400,
          error:
            "Could not alter item because your request had too many parameters",
        },
        {
          status: 400,
          error: "Could not alter item because it would change a path id",
        },
        { status: 404, error: nameFromPrefix(prefix) + " not found" },
        { status: 403, error: "You don't have the rights to retrieve this." },
      ],
    }
  );
  return patchF;
};

module.exports = generatePatch;
