const { createFilter, createOrder } = require("./generateGet");
const generateGet = require("./generateGet");
const { Models, Model, useModel } = require("../tests/model.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "",
  auth = { get: { access: anybody } };
const methods = generateMethods("/v/1/model", useModel, auth, "");

const { app, url, error, getPool, checkType, allChecked } =
  require("@apparts/backend-test")({
    testName: "get",
    apiContainer: methods.get,
    apiVersion: 1,
    schemas: [
      `
CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  "optionalVal" TEXT,
  "hasDefault" INT NOT NULL,
  mapped INT NOT NULL
);

CREATE TABLE submodel (
  id SERIAL PRIMARY KEY,
  "modelId" INT NOT NULL,
  "opt" TEXT,
  FOREIGN KEY ("modelId") REFERENCES model(id)
);

CREATE TABLE advancedmodel (
  id SERIAL PRIMARY KEY,
  textarray text[],
  object json
);`,
    ],
  });
const request = require("supertest");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, useSubModel } = require("../tests/submodel.js");
const {
  AdvancedModel,
  useAdvancedModel,
} = require("../tests/advancedmodel.js");

const formatFilter = (a) => encodeURIComponent(JSON.stringify(a));

describe("Get", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  checkJWT(() => request(app).get(url("model")), "", checkType);

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, {
      mapped: 10,
      optionalVal: "test",
    }).store();
    const model2 = await new Model(dbs, { mapped: 11 }).store();
    const response = await request(app)
      .get(url("model"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: model1.content.id,
        someNumber: 10,
        optionalVal: "test",
        isDerived: model1.content.id,
      },
      {
        id: model2.content.id,
        someNumber: 11,
        isDerived: model2.content.id,
      },
    ]);
    checkType(response, fName);
  });

  test("Get paginated", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 20 }).store();
    const response = await request(app)
      .get(url("model", { limit: 2 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);

    expect(response.body).toMatchObject([
      {
        someNumber: 10,
        optionalVal: "test",
      },
      {
        someNumber: 11,
      },
    ]);

    const response2 = await request(app)
      .get(url("model", { limit: 2, offset: 2 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([
      {
        id: model1.content.id,
        someNumber: 20,
      },
    ]);
    const response3 = await request(app)
      .get(url("model", { limit: 2, offset: 4 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response3.status).toBe(200);
    expect(response3.body).toMatchObject([]);

    checkType(response, fName);
    checkType(response2, fName);
    checkType(response3, fName);
  });

  test("Get ordered", async () => {
    const response = await request(app)
      .get(
        url("model", {
          order: encodeURIComponent(
            JSON.stringify([{ key: "id", dir: "DESC" }])
          ),
        })
      )
      .set("Authorization", "Bearer " + jwt());

    expect(response.body).toMatchObject([
      {
        id: 3,
        someNumber: 20,
      },
      {
        id: 2,
        someNumber: 11,
      },
      {
        id: 1,
        someNumber: 10,
        optionalVal: "test",
      },
    ]);
    expect(response.status).toBe(200);

    const response2 = await request(app)
      .get(
        url("model", {
          order: encodeURIComponent(
            JSON.stringify([{ key: "someNumber", dir: "DESC" }])
          ),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response2.body).toMatchObject([
      {
        id: 3,
        someNumber: 20,
      },
      {
        id: 2,
        someNumber: 11,
      },
      {
        id: 1,
        someNumber: 10,
        optionalVal: "test",
      },
    ]);
    expect(response2.status).toBe(200);

    checkType(response, fName);
    checkType(response2, fName);
  });

  test("Get with malformated filter", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: "garbidge",
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get with filter with unknown keys", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ dummy: 33 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get with filter with unknown operator", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: { gt: 30 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get with filter on mapped type", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, {
      mapped: 30,
    }).store();

    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: 30 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model1.content.id,
        someNumber: 30,
      },
    ]);
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    checkType(response, fName);
  });

  test("Get with filter with like operator on non-string", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: { like: "test" } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    const response2 = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: { like: 30 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    expect(response2.status).toBe(400);
    expect(response2.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get with filter on non-public type", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ hasDefault: 30 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get with filter wrong type", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: 77 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get with mapped filter wrong type", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: "77" }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });

  test("Get filtered string", async () => {
    const dbs = getPool();
    await new Model(dbs, {
      mapped: 30,
      optionalVal: "cheap",
    }).store();
    const model2 = await new Model(dbs, {
      mapped: 12,
      optionalVal: "dirty",
    }).store();
    const response = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ optionalVal: { like: "%rty" } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model2.content.id,
        optionalVal: "dirty",
      },
    ]);
    expect(response.body.length).toBe(1);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should filter number", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 13,
    }).store();

    const response = await request(app)
      .get(url("model", { filter: formatFilter({ someNumber: 13 }) }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model.content.id,
        someNumber: 13,
      },
    ]);
    expect(response.body.length).toBe(1);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should ignore empty filter for number", async () => {
    const dbs = getPool();
    const models = await new Models(dbs).load({});

    const response = await request(app)
      .get(url("model", { filter: formatFilter({ someNumber: {} }) }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body.length).toBe(models.contents.length);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should filter number with greate and smaller", async () => {
    const dbs = getPool();
    await new Model(dbs, {
      mapped: 103,
    }).store();
    const model2 = await new Model(dbs, {
      mapped: 104,
    }).store();
    await new Model(dbs, {
      mapped: 105,
    }).store();

    const response = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ someNumber: { gt: 103, lt: 105 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model2.content.id,
        someNumber: 104,
      },
    ]);
    expect(response.body.length).toBe(1);
    expect(response.status).toBe(200);
    checkType(response, fName);

    const response2 = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ someNumber: { gte: 104, lte: 104 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: model2.content.id,
        someNumber: 104,
      },
    ]);
    expect(response2.body.length).toBe(1);
    expect(response2.status).toBe(200);
    checkType(response2, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: { get: { access: () => false } },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should not grant access on no permission", async () => {
    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt());
    expect(responseGet.status).toBe(403);
    expect(responseGet.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responseGet, fName);
  });
});

describe("get subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud({
    prefix: path,
    app,
    model: useSubModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  const methods2 = generateMethods(path, useSubModel, auth, "");

  test("Get from subresouce", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    const model2 = await new Model(dbs, { mapped: 101 }).store();
    const submodel1 = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();

    const response = await request(app)
      .get(url(`model/${model1.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: submodel1.content.id,
        modelId: model1.content.id,
      },
    ]);
    expect(response.body.length).toBe(1);
    checkType(response, fName);

    const response2 = await request(app)
      .get(url(`model/${model2.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([]);
    expect(response2.body.length).toBe(0);
    checkType(response2, fName);

    await new SubModel(dbs, {
      modelId: model2.content.id,
    }).store();
    const response3 = await request(app)
      .get(
        url(`model/${model1.content.id}/submodel`, {
          filter: JSON.stringify({
            modelId: model2.content.id,
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response3.status).toBe(400);
    expect(response3.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response3, fName);
  });
});

describe("get advanced model", () => {
  const path = "/v/1/advancedmodel";
  addCrud({
    prefix: path,
    app,
    model: useAdvancedModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  const methods2 = generateMethods(path, useAdvancedModel, auth, "");

  test("Should return model", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const model1 = await new AdvancedModel(dbs, {
      textarray: ["erster", "zweiter"],
      object: { a: 22, bcd: "jup" },
    }).store();

    const response = await request(app)
      .get(url(`advancedmodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([model1.content]);
    expect(response.body.length).toBe(1);
    checkType(response, fName);
  });
});

describe("filter api type", () => {
  test("Should not include derived types", async () => {
    expect(createFilter("", useModel)).toStrictEqual({
      keys: {
        id: {
          alternatives: [
            {
              type: "id",
            },
          ],
          optional: true,
          type: "oneOf",
        },
        optionalVal: {
          alternatives: [
            {
              type: "string",
            },
            {
              keys: {
                like: {
                  type: "string",
                },
              },
              type: "object",
            },
          ],
          optional: true,
          type: "oneOf",
        },
        someNumber: {
          alternatives: [
            {
              type: "int",
            },
            {
              type: "object",
              keys: {
                gt: {
                  optional: true,
                  type: "int",
                },
                gte: {
                  optional: true,
                  type: "int",
                },
                lt: {
                  optional: true,
                  type: "int",
                },
                lte: {
                  optional: true,
                  type: "int",
                },
              },
            },
          ],
          optional: true,
          type: "oneOf",
        },
      },
      optional: true,
      type: "object",
    });
  });
  test("Should not include objects, arrays", async () => {
    expect(createFilter("", useAdvancedModel)).toStrictEqual({
      keys: {
        id: {
          alternatives: [
            {
              type: "id",
            },
          ],
          optional: true,
          type: "oneOf",
        },
      },
      optional: true,
      type: "object",
    });
  });
});

describe("order api type", () => {
  test("Should not include derived types", async () => {
    expect(createOrder(useModel)).toStrictEqual({
      items: {
        keys: {
          dir: {
            alternatives: [
              {
                value: "ASC",
              },
              {
                value: "DESC",
              },
            ],
            type: "oneOf",
          },
          key: {
            alternatives: [
              {
                value: "id",
              },
              {
                value: "optionalVal",
              },
              {
                value: "someNumber",
              },
            ],
            type: "oneOf",
          },
        },
        type: "object",
      },
      optional: true,
      type: "array",
    });
  });
  test("Should not include objects, arrays", async () => {
    expect(createOrder(useAdvancedModel)).toStrictEqual({
      items: {
        keys: {
          dir: {
            alternatives: [
              {
                value: "ASC",
              },
              {
                value: "DESC",
              },
            ],
            type: "oneOf",
          },
          key: {
            alternatives: [
              {
                value: "id",
              },
            ],
            type: "oneOf",
          },
        },
        type: "object",
      },
      optional: true,
      type: "array",
    });
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generateGet("model", useModel, {}, "").options;
    const options2 = generateGet(
      "model",
      useModel,
      { title: "My title", description: "yay" },
      ""
    ).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Get Model");
    expect(options2.title).toBe("My title");
    expect(options2.description).toBe("yay");
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
