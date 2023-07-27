import { Models } from "../tests/model";
const generateDelete = require("./generateDelete");
const { addCrud } = require("../");
const { generateMethods } = require("./");
const { validJwt, rejectAccess } = require("@apparts/prep");

const fName = "/:ids",
  auth = { delete: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") } };
const methods = generateMethods("/v/1/model", Models, auth, undefined, "id");

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
const { SubModels } = require("../tests/submodel");
const { AdvancedModels } = require("../tests/advancedmodel");
const { StrangeIdModels } = require("../tests/strangeids");
const { NamedIdModels } = require("../tests/namedIdModel");

describe("Delete", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });

  checkJWT(
    () => request(app).delete(url("model/[1]")).send({ someNumber: 3 }),
    fName,
    checkType
  );

  it("should reject without access function", async () => {
    expect(() => generateDelete("model", Models, {}, undefined, "id")).toThrow(
      "Route (delete) model has no access control function."
    );
  });

  test("Delete", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [{ mapped: 8 }]).store();
    const response = await request(app)
      .delete(url("model/" + JSON.stringify([model.content.id])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("ok");
    expect(response.status).toBe(200);
    await new Models(dbs).loadNone({ id: model.content.id });
    checkType(response, fName);
  });

  test("Delete multiple", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 8 }]).store();
    const model2 = await new Models(dbs, [{ mapped: 8 }]).store();
    const response = await request(app)
      .delete(
        url("model/" + JSON.stringify([model1.content.id, model2.content.id]))
      )
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ id: model1.content.id });
    await new Models(dbs).loadNone({ id: model2.content.id });
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
    const model = await new Models(dbs, [
      {
        mapped: 11,
        optionalVal: null,
      },
    ]).store();
    const response = await request(app)
      .delete(url("model/[393939]"))
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadOneByKeys({ id: model.content.id });
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    checkType(response, fName);
  });

  test("Delete multiple, some don't exist", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 8 }]).store();
    const model2 = await new Models(dbs, [{ mapped: 8 }]).store();
    const response = await request(app)
      .delete(
        url(
          "model/" +
            JSON.stringify([model1.content.id, 9339939, model2.content.id])
        )
      )
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ id: model1.content.id });
    await new Models(dbs).loadNone({ id: model2.content.id });
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
    model: Models,
    routes: { delete: { hasAccess: rejectAccess } },
  });

  test("Should not grant access on no permission", async () => {
    const responseDel = await request(app)
      .delete(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseDel.status).toBe(403);
    expect(responseDel.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
  });
});

describe("Delete subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud({
    prefix: path,
    app,
    model: SubModels,
    routes: auth,
  });

  checkJWT(
    () =>
      request(app).delete(url("model/1/submodel/[2]")).send({ someNumber: 3 }),
    fName,
    checkType
  );

  test("Delete a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 100 }]).store();
    const model2 = await new Models(dbs, [{ mapped: 101 }]).store();
    const submodel = await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    const submodel2 = await new SubModels(dbs, [
      {
        modelId: model2.content.id,
      },
    ]).store();
    const response = await request(app)
      .delete(
        url(`model/${model1.content.id}/submodel/[${submodel.content.id}]`)
      )
      .set("Authorization", "Bearer " + jwt());
    await new SubModels(dbs).loadNone({ modelId: model1.content.id });
    const submodelNew = await new SubModels(dbs).loadOne({
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
    const model = await new Models(dbs, [{ mapped: 100 }]).store();
    const submodel = await new SubModels(dbs, [
      {
        modelId: model.content.id,
      },
    ]).store();
    await new SubModels(dbs).loadOneByKeys({ id: submodel.content.id });
    await new Models(dbs).loadOneByKeys({ id: model.content.id });
    const response = await request(app)
      .delete(url(`model/[${model.content.id}]`))
      .set("Authorization", "Bearer " + jwt());

    expect(response.status).toBe(412);
    expect(response.body).toMatchObject(
      error("Could not delete as other items reference this item")
    );

    const submodelNew = await new SubModels(dbs).loadOneByKeys({
      id: submodel.content.id,
    });
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
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
    model: Models,
    routes: auth,
  });
  const methods2 = generateMethods(path, Models, auth, undefined, "id");

  test("Should delete a subresouce", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const submodel = await new Models(dbs, [
      {
        optionalVal: "test123",
        mapped: 1221,
      },
    ]).store();

    const response = await request(app)
      .delete(url(`test123/model/${JSON.stringify([submodel.content.id])}`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    await new Models(dbs).loadNone({
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
    model: AdvancedModels,
    routes: auth,
  });

  test("Should delete model", async () => {
    const dbs = getPool();

    const model1 = await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: { a: 22, bcd: "jup", innerWithDef: "bla" },
      },
    ]).store();

    const response = await request(app)
      .delete(url(`advancedmodel/` + JSON.stringify([model1.content.id])))
      .set("Authorization", "Bearer " + jwt());

    await new AdvancedModels(dbs).loadNone({});
    expect(response.status).toBe(200);
    expect(response.body).toBe("ok");
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generateDelete(
      "model",
      Models,
      { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") },
      undefined,
      "id"
    ).options;
    const options2 = generateDelete(
      "model",
      Models,
      {
        title: "My title",
        description: "yay",
        hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst"),
      },
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
    model: StrangeIdModels,
    routes: auth,
  });
  const methods2 = generateMethods(
    path,
    StrangeIdModels,
    auth,
    undefined,
    "id"
  );

  it("should delete with other id format", async () => {
    methods.delete[fName] = methods2.delete[fName];
    const dbs = getPool();
    await new StrangeIdModels(dbs, [
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
    const model2 = await new StrangeIdModels(dbs).load({});
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
    model: NamedIdModels,
    routes: auth,
    idField: "specialId",
  });
  const methods2 = generateMethods(
    path,
    NamedIdModels,
    auth,
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
