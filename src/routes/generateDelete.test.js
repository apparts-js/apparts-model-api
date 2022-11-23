const { NoModel, Model, useModel } = require("../tests/model.js");
const generateDelete = require("./generateDelete");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "/:ids",
  auth = { delete: { access: anybody } };
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
    testName: "delete",
    apiContainer: methods.delete,
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
  opt TEXT,
  FOREIGN KEY ("modelId") REFERENCES model(id)
);

CREATE TABLE advancedmodel (
  id SERIAL PRIMARY KEY,
  textarray text[],
  object json,
  jsonarray json
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
    apiVersion: 1,
  });
const request = require("supertest");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, NoSubModel, useSubModel } = require("../tests/submodel.js");
const {
  AdvancedModel,
  NoAdvancedModel,
  useAdvancedModel,
} = require("../tests/advancedmodel.js");
const { StangeIdModels, useStangeIdModel } = require("../tests/strangeids.js");
const { NamedIdModels, useNamedIdModel } = require("../tests/namedIdModel.js");

describe("Delete", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  checkJWT(
    () => request(app).delete(url("model/[1]")).send({ someNumber: 3 }),
    fName,
    checkType
  );

  it("should reject without access function", async () => {
    expect(() =>
      generateDelete("model", useModel, {}, "", undefined, "id")
    ).toThrow("Route (delete) model has no access control function.");
  });

  test("Delete", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .delete(url("model/" + JSON.stringify([model.content.id])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    await new NoModel(dbs).loadNone({ id: model.content.id });
    checkType(response, fName);
  });

  test("Delete multiple", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 8 }).store();
    const model2 = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .delete(
        url("model/" + JSON.stringify([model1.content.id, model2.content.id]))
      )
      .set("Authorization", "Bearer " + jwt());
    await new NoModel(dbs).loadNone({ id: model1.content.id });
    await new NoModel(dbs).loadNone({ id: model2.content.id });
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  test("Delete none", async () => {
    const response = await request(app)
      .delete(url("model/" + JSON.stringify([])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  test("Delete non existing model", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, {
      mapped: 11,
      optionalVal: null,
    }).store();
    const response = await request(app)
      .delete(url("model/[393939]"))
      .set("Authorization", "Bearer " + jwt());
    await new Model(dbs).loadById(model.content.id);
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    checkType(response, fName);
  });

  test("Delete multiple, some don't exist", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 8 }).store();
    const model2 = await new Model(dbs, { mapped: 8 }).store();
    const response = await request(app)
      .delete(
        url(
          "model/" +
            JSON.stringify([model1.content.id, 9339939, model2.content.id])
        )
      )
      .set("Authorization", "Bearer " + jwt());
    await new NoModel(dbs).loadNone({ id: model1.content.id });
    await new NoModel(dbs).loadNone({ id: model2.content.id });
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    checkType(response, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: { delete: { access: () => false } },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should not grant access on no permission", async () => {
    const responseDel = await request(app)
      .delete(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseDel.status).toBe(403);
    expect(responseDel.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responseDel, fName);
  });
});

describe("Delete subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud({
    prefix: path,
    app,
    model: useSubModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  checkJWT(
    () =>
      request(app).delete(url("model/1/submodel/[2]")).send({ someNumber: 3 }),
    fName,
    checkType
  );

  test("Delete a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    const model2 = await new Model(dbs, { mapped: 101 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model1.content.id,
    }).store();
    const submodel2 = await new SubModel(dbs, {
      modelId: model2.content.id,
    }).store();
    const response = await request(app)
      .delete(
        url(`model/${model1.content.id}/submodel/[${submodel.content.id}]`)
      )
      .set("Authorization", "Bearer " + jwt());
    await new NoSubModel(dbs).loadNone({ modelId: model1.content.id });
    const submodelNew = await new SubModel(dbs).load({
      modelId: model2.content.id,
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    expect(submodelNew.content).toMatchObject({
      id: submodel2.content.id,
      modelId: model2.content.id,
    });
    checkType(response, fName);
  });

  test("Delete reference of a a subresouce", async () => {
    const dbs = getPool();
    const model = await new Model(dbs, { mapped: 100 }).store();
    const submodel = await new SubModel(dbs, {
      modelId: model.content.id,
    }).store();
    await new SubModel(dbs).loadById(submodel.content.id);
    await new Model(dbs).loadById(model.content.id);
    const response = await request(app)
      .delete(url(`model/[${model.content.id}]`))
      .set("Authorization", "Bearer " + jwt());

    expect(response.status).toBe(412);
    expect(response.body).toMatchObject(
      error("Could not delete as other items reference this item")
    );

    const submodelNew = await new SubModel(dbs).loadById(submodel.content.id);
    const modelNew = await new Model(dbs).loadById(model.content.id);
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model.content.id,
    });
    expect(modelNew.content).toMatchObject({
      id: model.content.id,
      mapped: model.content.mapped,
    });
    checkType(response, fName);
  });
});

describe("delete subresources with optional relation", () => {
  const path = "/v/1/:optionalVal/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });
  const methods2 = generateMethods(path, useModel, auth, "", undefined, "id");

  test("Should delete a subresouce", async () => {
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
      .delete(url(`test123/model/${JSON.stringify([submodel.content.id])}`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    await new NoModel(dbs, {
      id: submodel.content.id,
      optionalVal: "test123",
      mapped: 1221,
    });
    checkType(response, fName);
  });
});

describe("delete advanced model", () => {
  const path = "/v/1/advancedmodel";
  addCrud({
    prefix: path,
    app,
    model: useAdvancedModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should delete model", async () => {
    const dbs = getPool();

    const model1 = await new AdvancedModel(dbs, {
      textarray: ["erster", "zweiter"],
      object: {
        a: 22,
        bcd: "jup",
        innerWithDef: "bla",
        readOnlyString: "read",
      },
    }).store();

    const response = await request(app)
      .delete(url(`advancedmodel/` + JSON.stringify([model1.content.id])))
      .set("Authorization", "Bearer " + jwt());

    await new NoAdvancedModel(dbs).loadNone({});
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generateDelete(
      "model",
      useModel,
      { access: anybody },
      "",
      undefined,
      "id"
    ).options;
    const options2 = generateDelete(
      "model",
      useModel,
      { title: "My title", description: "yay", access: anybody },
      "",
      undefined,
      "id"
    ).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Delete Model");
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

  it("should delete with other id format", async () => {
    methods.delete[fName] = methods2.delete[fName];
    const dbs = getPool();
    await new StangeIdModels(dbs, [
      {
        id: "test1",
        val: 1,
      },
      {
        id: "test2",
        val: 2,
      },
    ]).store();
    const response = await request(app)
      .delete(url("strangemodel/" + JSON.stringify(["test1"])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    const model2 = await new StangeIdModels(dbs).load({});
    expect(model2.contents).toMatchObject([
      {
        id: "test2",
        val: 2,
      },
    ]);
    expect(model2.contents.length).toBe(1);
    checkType(response, fName);
  });
});

describe("Ids with different name", () => {
  const fName = "/:specialIds";
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

  it("should delete with named id", async () => {
    methods.delete[fName] = methods2.delete[fName];
    const dbs = getPool();
    await new NamedIdModels(dbs, [
      {
        specialId: 1,
        val: 1,
      },
      {
        specialId: 2,
        val: 2,
      },
    ]).store();
    const response = await request(app)
      .delete(url("namedid/" + JSON.stringify([1])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    const model2 = await new NamedIdModels(dbs).load({});
    expect(model2.contents).toMatchObject([
      {
        specialId: 2,
        val: 2,
      },
    ]);
    expect(model2.contents.length).toBe(1);
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked("/:ids");
});
