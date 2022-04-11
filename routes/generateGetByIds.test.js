const { Model, useModel } = require("../tests/model.js");
const generateGetByIds = require("./generateGetByIds");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "/:ids",
  auth = { getByIds: { access: anybody } };
const methods = generateMethods("/v/1/model", useModel, auth, "");

const { app, url, getPool, checkType, allChecked, error } =
  require("@apparts/backend-test")({
    testName: "getByIds",
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
const { StangeIdModel, useStangeIdModel } = require("../tests/strangeids.js");

describe("getByIds", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  checkJWT(() => request(app).get(url("model/[]")), "/:ids", checkType);

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, {
      mapped: 10,
      optionalVal: "test",
    }).store();
    await new Model(dbs, { mapped: 11 }).store();
    const model3 = await new Model(dbs, { mapped: 12 }).store();
    const response = await request(app)
      .get(
        url("model/" + JSON.stringify([model3.content.id, model1.content.id]))
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: model1.content.id,
        isDerived: model1.content.id,
        optionalVal: "test",
        someNumber: model1.content.mapped,
      },
      {
        isDerived: model3.content.id,
        id: model3.content.id,
        someNumber: model3.content.mapped,
      },
    ]);
    expect(response.body.length).toBe(2);
    checkType(response, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: { getByIds: { access: () => false } },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should not grant access on no permission", async () => {
    const responseGetById = await request(app)
      .get(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseGetById.status).toBe(403);
    expect(responseGetById.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responseGetById, fName);
  });
});

describe("getByIds subresources", () => {
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
    await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const submodel3 = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    await new SubModel(dbs, {
      modelId: model2.content.id,
    }).store();

    const response = await request(app)
      .get(
        url(
          `model/${model1.content.id}/submodel/${JSON.stringify([
            submodel1.content.id,
            submodel3.content.id,
          ])}`
        )
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: submodel1.content.id,
        modelId: model1.content.id,
      },
      {
        id: submodel3.content.id,
        modelId: model1.content.id,
      },
    ]);
    expect(response.body.length).toBe(2);
    checkType(response, fName);

    const response2 = await request(app)
      .get(
        url(
          `model/${model2.content.id}/submodel/${JSON.stringify([
            submodel1.content.id,
          ])}`
        )
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject([]);
    expect(response2.body.length).toBe(0);
    checkType(response, fName);
  });
});

describe("getByIds advanced model", () => {
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
      .get(url(`advancedmodel/` + JSON.stringify([model1.content.id])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([model1.content]);
    expect(response.body.length).toBe(1);
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generateGetByIds("model", useModel, {}, "").options;
    const options2 = generateGetByIds(
      "model",
      useModel,
      { title: "My title", description: "yay" },
      ""
    ).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Get Model by Ids");
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
  const methods2 = generateMethods(path, useStangeIdModel, auth, "");

  it("should get with other id format", async () => {
    methods.get[fName] = methods2.get[fName];
    const dbs = getPool();
    const model1 = await new StangeIdModel(dbs, {
      id: "test1",
      val: 1,
    }).store();
    const response = await request(app)
      .get(url("strangemodel/" + JSON.stringify([model1.content.id])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        id: "test1",
        val: 1,
      },
    ]);
    expect(response.body.length).toBe(1);
    checkType(response, fName);
  });
});

describe("empty id array", () => {
  it("should return nothign", async () => {
    const response = await request(app)
      .get(url("model/" + JSON.stringify([])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([]);
    expect(response.body.length).toBe(0);
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
