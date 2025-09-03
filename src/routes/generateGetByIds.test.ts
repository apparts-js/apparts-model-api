import * as types from "@apparts/types";
import { Models } from "../tests/model";
import { generateGetByIds } from "./generateGetByIds";
import { addCrud } from "../";
import { generateMethods } from "./";
import { validJwt, rejectAccess } from "@apparts/prep";

const fName = "/:ids",
  auth = { getByIds: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") } };

const methods = generateMethods("/v/1/model", Models, auth, undefined, "id");

import setupTest from "@apparts/backend-test";
const { app, url, getPool, checkType, allChecked, error } = setupTest({
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
);

CREATE TABLE namedidmodel (
  "specialId" SERIAL PRIMARY KEY,
  val INT NOT NULL
);`,
  ],
});

import request from "supertest";
import { checkJWT, jwt } from "../tests/checkJWT";
import { SubModels } from "../tests/submodel";
import { AdvancedModels } from "../tests/advancedmodel";
import { StrangeIdModels } from "../tests/strangeids";
import { NamedIdModels } from "../tests/namedIdModel";

describe("getByIds", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });

  checkJWT(() => request(app).get(url("model/[]")), "/:ids", checkType);

  it("should reject without access function", async () => {
    expect(() =>
      generateGetByIds({
        prefix: "model",
        Model: Models,
        routeConfig: {} as any,
        idField: "id",
        extraPathFields: types.obj({}),
      })
    ).toThrow("Route (getByIds) model has no access control function.");
  });

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [
      {
        mapped: 10,
        optionalVal: "test",
      },
    ]).store();
    await new Models(dbs, [{ mapped: 11 }]).store();
    const model3 = await new Models(dbs, [{ mapped: 12 }]).store();
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
    model: Models,
    routes: { getByIds: { hasAccess: rejectAccess } },
  });

  test("Should not grant access on no permission", async () => {
    const responseGetById = await request(app)
      .get(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseGetById.status).toBe(403);
    expect(responseGetById.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
  });
});

describe("getByIds subresources", () => {
  const path = "/v/1/model/:modelId/submodel";

  addCrud({
    prefix: path,
    app,
    model: SubModels,
    routes: auth,
  });
  const methods2 = generateMethods(path, SubModels, auth, undefined, "id");

  test("Get from subresouce", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 100 }]).store();
    const model2 = await new Models(dbs, [{ mapped: 101 }]).store();
    const submodel1 = await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    const submodel3 = await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    await new SubModels(dbs, [
      {
        modelId: model2.content.id,
      },
    ]).store();

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

describe("getByIds subresources with optional relation", () => {
  const path = "/v/1/:optionalVal/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });
  const methods2 = generateMethods(path, Models, auth, undefined, "id");

  test("Should getByIds a subresouce", async () => {
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
      .get(url(`test123/model/${JSON.stringify([submodel.content.id])}`))
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

describe("getByIds advanced model", () => {
  const path = "/v/1/advancedmodel";
  addCrud({
    prefix: path,
    app,
    model: AdvancedModels,
    routes: auth,
  });
  const methods2 = generateMethods(path, AdvancedModels, auth, undefined, "id");

  test("Should return model", async () => {
    // This makes allChecked (at the end) think, these tests operate
    // on the same function as the ones from above. I can't let them
    // run on the same function as the returns are slightly different.
    // Little hacky but I don't want to rewrite all tests.
    methods.get[fName] = methods2.get[fName];

    const dbs = getPool();
    const model1 = await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: { a: 22, bcd: "jup", innerWithDef: "bla" },
      },
    ]).store();

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
    const options1 = generateGetByIds({
      prefix: "model",
      Model: Models,
      routeConfig: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") },
      idField: "id",
      extraPathFields: types.obj({}),
    }).options;
    const options2 = generateGetByIds({
      prefix: "model",
      Model: Models,
      routeConfig: {
        title: "My title",
        description: "yay",
        hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst"),
      },
      idField: "id",
      extraPathFields: types.obj({}),
    }).options;

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

  it("should get with other id format", async () => {
    methods.get[fName] = methods2.get[fName];
    const dbs = getPool();
    const model1 = await new StrangeIdModels(dbs, [
      {
        id: "test1",
        val: 1,
      },
    ]).store();
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

  it("should get with other id format", async () => {
    methods.get[fName] = methods2.get[fName];
    const dbs = getPool();
    const model1 = await new NamedIdModels(dbs, [
      {
        specialId: 1,
        val: 1,
      },
    ]).store();
    const response = await request(app)
      .get(url("namedid/" + JSON.stringify([model1.content.specialId])))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        specialId: 1,
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

describe("Injected Params", () => {
  const path = "/v/1/modelInjected";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: {
      getByIds: {
        ...auth.getByIds,
        injectParameters: {
          hasDefault: async () => Promise.resolve(12),
        },
      },
    },
  });
  const methods2 = generateMethods(path, Models, auth, undefined, "id");

  beforeAll(() => {
    methods.get[fName] = methods2.get[fName];
  });

  beforeEach(async () => {
    await new SubModels(getPool()).delete({});
    await new Models(getPool()).delete({});
  });

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [
      {
        mapped: 10,
        hasDefault: 12,
      },
      {
        mapped: 11,
        hasDefault: 13,
      },
      {
        mapped: 12,
        hasDefault: 12,
      },
    ]).store();

    const response = await request(app)
      .get(
        url(
          "modelInjected/" +
            JSON.stringify([model1.contents[0].id, model1.contents[1].id])
        )
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body).toMatchObject([
      {
        id: model1.contents[0].id,
      },
    ]);
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
