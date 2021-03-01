const {
  createParams,
  createBody,
  nameFromPrefix,
  reverseMap,
  checkAuth,
} = require("./common");
const { HttpError, fromThrows } = require("@apparts/error");
const { prepauthTokenJWT } = require("@apparts/types");
const { DoesExist } = require("@apparts/model");

const generatePost = (prefix, useModel, authF, webtokenkey) => {
  const postF = prepauthTokenJWT(webtokenkey)(
    {
      params: {
        ...createParams(prefix, useModel),
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
            "Could not create item because your request had too many parameters",
            e.message
          )
      );

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
      await fromThrows(
        () => model.store(),
        DoesExist,
        () => new HttpError(412, "Could not create item because it exists")
      );
      return model.content.id;
    },
    {
      title: "Create " + nameFromPrefix(prefix),
      returns: [
        {
          status: 200,
          type: "id",
        },
        {
          status: 400,
          error:
            "Could not create item because your request had too many parameters",
        },
        { status: 412, error: "Could not create item because it exists" },
        { status: 403, error: "You don't have the rights to retrieve this." },
      ],
    }
  );
  return postF;
};

module.exports = generatePost;
