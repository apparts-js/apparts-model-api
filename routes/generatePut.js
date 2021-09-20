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

const generatePut = (
  prefix,
  useModel,
  { access: authF, title, description },
  webtokenkey
) => {
  const putF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
        id: createIdParam(useModel),
      },
      body: {
        ...createBody(prefix, useModel),
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
        .filter((key) => !body[key] && types[key].public && types[key].optional)
        .forEach((key) => {
          optionalsToBeRemoved[key] = null;
        });

      const paramOverlap = Object.keys(body).filter((key) => params[key]);
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
      model.content = { ...model.content, ...body, ...optionalsToBeRemoved };
      await model.update();
      return model.content.id;
    },
    {
      title: title || "Alter " + nameFromPrefix(prefix),
      description,
      returns: [
        {
          status: 200,
          ...createIdParam(useModel),
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
  return putF;
};

module.exports = generatePut;
