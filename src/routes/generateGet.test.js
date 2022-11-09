const generateGet = require("./generateGet");
const { Models, Model, useModel } = require("../tests/model.js");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "",
  auth = { get: { access: anybody } };
const methods = generateMethods(
  "/v/1/model",
  useModel,
  auth,
  "",
  undefined,
  "id"
);

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
);
CREATE TABLE strangeids (
  id VARCHAR(8) PRIMARY KEY,
  val INT NOT NULL
);
CREATE TABLE namedidmodel (
  "specialId" SERIAL PRIMARY KEY,
  val INT NOT NULL
);`,
    ],
  });
const request = require("supertest");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, useSubModel } = require("../tests/submodel.js");
const {
  AdvancedModels,
  AdvancedModel,
  useAdvancedModel,
} = require("../tests/advancedmodel.js");
const { StangeIdModel, useStangeIdModel } = require("../tests/strangeids.js");
const { NamedIdModel, useNamedIdModel } = require("../tests/namedIdModel.js");

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

  it("should reject without access function", async () => {
    expect(() => generateGet("model", useModel, {}, "", "id")).toThrow(
      "Route (get) model has no access control function."
    );
  });

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
});

describe("Filters", () => {
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

  test("Get with filter with null value", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ optionalVal: null }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    const normalResponse = await request(app)
      .get(url("model"))
      .set("Authorization", "Bearer " + jwt());

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(normalResponse.body.length);
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

  it("should get like-filtered string", async () => {
    const dbs = getPool();
    await new Model(dbs, {
      mapped: 30,
      optionalVal: "cheap",
    }).store();
    const model2 = await new Model(dbs, {
      mapped: 12,
      optionalVal: "dirty",
    }).store();
    await new Model(dbs, {
      mapped: 12,
      optionalVal: "diRty",
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

  it("should get ilike-filtered string", async () => {
    const response = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ optionalVal: { ilike: "%rty" } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        optionalVal: "dirty",
      },
      {
        optionalVal: "diRty",
      },
    ]);
    expect(response.body.length).toBe(2);
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

  it("should filter exists", async () => {
    const responseExists = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ optionalVal: { exists: true } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(
      responseExists.body.reduce(
        (a, { optionalVal }) => a && optionalVal !== null,
        true
      )
    ).toBeTruthy();
    expect(responseExists.body.length > 0).toBeTruthy();
    expect(responseExists.status).toBe(200);
    checkType(responseExists, fName);
    const responseDoesNotExist = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ optionalVal: { exists: false } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(
      responseDoesNotExist.body.reduce(
        (a, { optionalVal }) => a && optionalVal === undefined,
        true
      )
    ).toBeTruthy();
    expect(responseDoesNotExist.body.length > 0).toBeTruthy();
    expect(responseDoesNotExist.status).toBe(200);
    checkType(responseDoesNotExist, fName);

    const { contents } = await new Models(getPool()).load({});
    expect(contents.length).toBe(
      responseDoesNotExist.body.length + responseExists.body.length
    );
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
  const methods2 = generateMethods(
    path,
    useSubModel,
    auth,
    "",
    undefined,
    "id"
  );

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

describe("Get subresources with optional relation", () => {
  const path = "/v/1/:optionalVal/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  const methods2 = generateMethods(path, useModel, auth, "", undefined, "id");

  test("Should get a subresouce", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const submodel = await new Model(dbs, {
      optionalVal: "test123",
      mapped: 1221,
    }).store();

    const response = await request(app)
      .get(url(`test123/model`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body).toMatchObject([
      {
        optionalVal: "test123",
        id: submodel.content.id,
      },
    ]);
    checkType(response, fName);
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
  const methods2 = generateMethods(
    path,
    useAdvancedModel,
    auth,
    "",
    undefined,
    "id"
  );

  test("Should return model", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const model1 = await new AdvancedModel(dbs, {
      textarray: ["erster", "zweiter"],
      object: { a: 22, bcd: "jup", innerWithDef: "bla" },
    }).store();

    const response = await request(app)
      .get(url(`advancedmodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([model1.content]);
    expect(response.body.length).toBe(1);
    checkType(response, fName);
  });
  it("should return ordered by object keys", async () => {
    const dbs = getPool();
    await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 11,
          bcd: "zzz",
          nestedObj: { inner: "zzz" },
          innerWithDef: "bla",
        },
      },
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 999,
          bcd: "abc",
          nestedObj: { inner: "def" },
          innerWithDef: "bla",
        },
      },
    ]).store();

    const response = await request(app)
      .get(
        url(`advancedmodel`, {
          order: encodeURIComponent(
            JSON.stringify([{ key: "object.a", dir: "DESC" }])
          ),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { object: { a: 999 } },
      { object: { a: 22 } },
      { object: { a: 11 } },
    ]);
    expect(response.body.length).toBe(3);
    checkType(response, fName);
  });
  it("should return ordered by nested object keys", async () => {
    const response = await request(app)
      .get(
        url(`advancedmodel`, {
          order: encodeURIComponent(
            JSON.stringify([{ key: "object.nestedObj.inner", dir: "DESC" }])
          ),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { object: { a: 22 } },
      { object: { nestedObj: { inner: "zzz" } } },
      { object: { nestedObj: { inner: "def" } } },
    ]);
    expect(response.body.length).toBe(3);
    checkType(response, fName);
  });
  test("Should return filtered by object key", async () => {
    const response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: JSON.stringify({
            "object.a": {
              gt: 11,
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { object: { a: 22 } },
      { object: { a: 999 } },
    ]);
    expect(response.body.length).toBe(2);
    checkType(response, fName);
  });
  test("Should return filtered by object key, with and", async () => {
    const response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: JSON.stringify({
            "object.a": {
              gt: 11,
              lt: 111,
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ object: { a: 22 } }]);
    expect(response.body.length).toBe(1);
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generateGet(
      "model",
      useModel,
      { access: anybody },
      "",
      "id"
    ).options;
    const options2 = generateGet(
      "model",
      useModel,
      { title: "My title", description: "yay", access: anybody },
      "",
      "id"
    ).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Get Model");
    expect(options2.title).toBe("My title");
    expect(options2.description).toBe("yay");
  });
});

describe("Ids of other format", () => {
  const path = "/v/1/strangemodel";
  addCrud({
    prefix: path,
    app,
    model: useStangeIdModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  const methods2 = generateMethods(
    path,
    useStangeIdModel,
    auth,
    "",
    undefined,
    "id"
  );

  it("should get with other id format", async () => {
    methods.get[fName] = methods2.get[fName];
    const dbs = getPool();
    await new StangeIdModel(dbs, {
      id: "test1",
      val: 1,
    }).store();
    const response = await request(app)
      .get(url("strangemodel"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        id: "test1",
        val: 1,
      },
    ]);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });
});

describe("Ids with different name", () => {
  const path = "/v/1/namedid";
  addCrud({
    prefix: path,
    app,
    model: useNamedIdModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
    idField: "specialId",
  });
  const methods2 = generateMethods(
    path,
    useNamedIdModel,
    auth,
    "",
    undefined,
    "specialId"
  );

  it("should put with named id", async () => {
    methods.get[fName] = methods2.get[fName];
    const dbs = getPool();
    await new NamedIdModel(dbs, {
      specialId: 1,
      val: 1,
    }).store();
    const response = await request(app)
      .get(url("namedid"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject([
      {
        specialId: 1,
        val: 1,
      },
    ]);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
