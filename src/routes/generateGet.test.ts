import { generateGet } from "./generateGet";
import * as types from "@apparts/types";
import { Models } from "../tests/model";
import { addCrud } from "../";
import { generateMethods } from "./";
import { validJwt, rejectAccess } from "@apparts/prep";

const fName = "",
  auth = { get: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") } };
const methods = generateMethods("/v/1/model", Models, auth, undefined, "id");

import setupTest from "@apparts/backend-test";
const { app, url, error, getPool, checkType, allChecked } = setupTest({
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
  object jsonb
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

const formatFilter = (a) => encodeURIComponent(JSON.stringify(a));

describe("Get", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });
  checkJWT(() => request(app).get(url("model")), "", checkType);

  it("should reject without access function", async () => {
    expect(() =>
      generateGet({
        prefix: "model",
        Model: Models,
        routeConfig: {} as any,
        idField: "id",
        extraPathFields: types.obj({}),
      })
    ).toThrow("Route (get) model has no access control function.");
  });

  test("Get all", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [
      {
        mapped: 10,
        optionalVal: "test",
      },
    ]).store();
    const model2 = await new Models(dbs, [{ mapped: 11 }]).store();
    const response = await request(app)
      .get(url("model"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 2,
      data: [
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
      ],
    });
    checkType(response, fName);
  });

  test("Get paginated", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 20 }]).store();
    const response = await request(app)
      .get(url("model", { limit: 2 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      total: 3,
      data: [
        {
          someNumber: 10,
          optionalVal: "test",
        },
        {
          someNumber: 11,
        },
      ],
    });

    const response2 = await request(app)
      .get(url("model", { limit: 2, offset: 2 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject({
      total: 3,
      data: [
        {
          id: model1.content.id,
          someNumber: 20,
        },
      ],
    });
    const response3 = await request(app)
      .get(url("model", { limit: 2, offset: 4 }))
      .set("Authorization", "Bearer " + jwt());
    expect(response3.status).toBe(200);
    expect(response3.body).toMatchObject({ data: [] });

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

    expect(response.body).toMatchObject({
      data: [
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
      ],
    });
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
    expect(response2.body).toMatchObject({
      data: [
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
      ],
    });
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

  test("Get with filter on mapped type", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [
      {
        mapped: 30,
      },
    ]).store();

    const response = await request(app)
      .get(
        url("model", {
          filter: JSON.stringify({ someNumber: 30 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model1.content.id,
          someNumber: 30,
        },
      ],
    });
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
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
    await new Models(dbs, [
      {
        mapped: 30,
        optionalVal: "cheap",
      },
    ]).store();
    const model2 = await new Models(dbs, [
      {
        mapped: 12,
        optionalVal: "dirty",
      },
    ]).store();
    await new Models(dbs, [
      {
        mapped: 12,
        optionalVal: "diRty",
      },
    ]).store();
    const response = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ optionalVal: { like: "%rty" } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model2.content.id,
          optionalVal: "dirty",
        },
      ],
    });
    expect(response.body.data.length).toBe(1);
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
    expect(response.body).toMatchObject({
      data: [
        {
          optionalVal: "dirty",
        },
        {
          optionalVal: "diRty",
        },
      ],
    });
    expect(response.body.data.length).toBe(2);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should filter number", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 13,
      },
      {
        mapped: 14,
      },
    ]).store();

    const response = await request(app)
      .get(url("model", { filter: formatFilter({ someNumber: 13 }) }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model.contents[0].id,
          someNumber: 13,
        },
      ],
    });
    expect(response.body.data.length).toBe(1);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should ignore empty filter for number", async () => {
    const dbs = getPool();
    const models = await new Models(dbs).load({});

    const response = await request(app)
      .get(url("model", { filter: formatFilter({ someNumber: {} }) }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body.data.length).toBe(models.contents.length);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should filter number with greate and smaller", async () => {
    const dbs = getPool();
    await new Models(dbs, [
      {
        mapped: 103,
      },
    ]).store();
    const model2 = await new Models(dbs, [
      {
        mapped: 104,
      },
    ]).store();
    await new Models(dbs, [
      {
        mapped: 105,
      },
    ]).store();

    const response = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ someNumber: { gt: 103, lt: 105 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model2.content.id,
          someNumber: 104,
        },
      ],
    });
    expect(response.body.data.length).toBe(1);
    expect(response.status).toBe(200);
    checkType(response, fName);

    const response2 = await request(app)
      .get(
        url("model", {
          filter: formatFilter({ someNumber: { gte: 104, lte: 104 } }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model2.content.id,
          someNumber: 104,
        },
      ],
    });
    expect(response2.body.data.length).toBe(1);
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
      responseExists.body.data.reduce(
        (a, { optionalVal }) => a && optionalVal !== null,
        true
      )
    ).toBeTruthy();
    expect(responseExists.body.data.length > 0).toBeTruthy();
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
      responseDoesNotExist.body.data.reduce(
        (a, { optionalVal }) => a && optionalVal === undefined,
        true
      )
    ).toBeTruthy();
    expect(responseDoesNotExist.body.data.length > 0).toBeTruthy();
    expect(responseDoesNotExist.status).toBe(200);
    checkType(responseDoesNotExist, fName);

    const { contents } = await new Models(getPool()).load({});
    expect(contents.length).toBe(
      responseDoesNotExist.body.data.length + responseExists.body.data.length
    );
  });

  it("should filter with array", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 140,
      },
      {
        mapped: 141,
      },
      {
        mapped: 142,
      },
    ]).store();

    const response = await request(app)
      .get(url("model", { filter: formatFilter({ someNumber: [140, 142] }) }))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model.contents[0].id,
          someNumber: 140,
        },
        {
          id: model.contents[2].id,
          someNumber: 142,
        },
      ],
    });
    expect(response.body.data.length).toBe(2);
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
    routes: {
      get: {
        hasAccess: rejectAccess,
      },
    },
  });

  test("Should not grant access on no permission", async () => {
    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt());
    expect(responseGet.status).toBe(403);
  });
});

describe("get subresources", () => {
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

    const response = await request(app)
      .get(url(`model/${model1.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [
        {
          id: submodel1.content.id,
          modelId: model1.content.id,
        },
      ],
    });
    expect(response.body.data.length).toBe(1);
    checkType(response, fName);

    const response2 = await request(app)
      .get(url(`model/${model2.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject({ data: [] });
    expect(response2.body.data.length).toBe(0);
    checkType(response2, fName);

    await new SubModels(dbs, [
      {
        modelId: model2.content.id,
      },
    ]).store();
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
    model: Models,
    routes: auth,
  });
  const methods2 = generateMethods(path, Models, auth, undefined, "id");

  test("Should get a subresouce", async () => {
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
      .get(url(`test123/model`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body).toMatchObject({
      data: [
        {
          optionalVal: "test123",
          id: submodel.content.id,
        },
      ],
    });
    checkType(response, fName);
  });
});

describe("get advanced model", () => {
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
      .get(url(`advancedmodel`))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [model1.content] });
    expect(response.body.data.length).toBe(1);
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
    expect(response.body).toMatchObject({
      data: [
        { object: { a: 999 } },
        { object: { a: 22 } },
        { object: { a: 11 } },
      ],
    });
    expect(response.body.data.length).toBe(3);
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
    expect(response.body).toMatchObject({
      data: [
        { object: { a: 22 } },
        { object: { nestedObj: { inner: "zzz" } } },
        { object: { nestedObj: { inner: "def" } } },
      ],
    });
    expect(response.body.data.length).toBe(3);
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
    expect(response.body).toMatchObject({
      data: [{ object: { a: 22 } }, { object: { a: 999 } }],
    });
    expect(response.body.data.length).toBe(2);
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
    expect(response.body).toMatchObject({ data: [{ object: { a: 22 } }] });
    expect(response.body.data.length).toBe(1);
    checkType(response, fName);
  });
  test("Should return filtered mixed oneOf", async () => {
    let response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: JSON.stringify({
            "object.nestedOneOf": {
              gt: 11,
              lt: 111,
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(0);
    checkType(response, fName);

    const dbs = getPool();
    await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 471,
          bcd: "zzz",
          nestedOneOf: 12,
        },
      },
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 472,
          bcd: "zzz",
          nestedOneOf: "test",
        },
      },
    ]).store();

    response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: JSON.stringify({
            "object.nestedOneOf": {
              gt: 11,
              lt: 111,
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [{ object: { a: 471 } }] });
    expect(response.body.data.length).toBe(1);
    checkType(response, fName);

    response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: formatFilter({
            "object.nestedOneOf": {
              ilike: "%est",
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [{ object: { a: 472 } }] });

    expect(response.body.data.length).toBe(1);
    checkType(response, fName);
  });
  test("Should return filtered nested oneOf with object", async () => {
    let response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: formatFilter({
            "object.nestedOneOfWithObj.a": {
              ilike: "%est",
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(0);
    checkType(response, fName);

    const dbs = getPool();
    await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 473,
          bcd: "zzz",
          nestedOneOfWithObj: {
            a: "test",
          },
        },
      },
    ]).store();

    response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: formatFilter({
            "object.nestedOneOfWithObj.a": {
              ilike: "%est",
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [{ object: { a: 473 } }] });
    expect(response.body.data.length).toBe(1);
    checkType(response, fName);

    response = await request(app)
      .get(
        url(`advancedmodel`, {
          filter: formatFilter({
            "object.nestedOneOfWithObj.a": {
              exists: true,
            },
          }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [{ object: { a: 473 } }] });
    expect(response.body.data.length).toBe(1);
    checkType(response, fName);
  });

  it("should filter with value in object", async () => {
    const dbs = getPool();
    const model = await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 9935,
          bcd: "zzy",
        },
      },
    ]).store();
    const response = await request(app)
      .get(
        url("advancedmodel", {
          filter: formatFilter({ "object.a": 9935 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model.contents[0].id,
        },
      ],
    });
    expect(response.body.data.length).toBe(1);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });

  it("should filter with array in object", async () => {
    const dbs = getPool();
    const model = await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 533,
          bcd: "zzz",
        },
      },
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 534,
          bcd: "zzy",
        },
      },
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 535,
          bcd: "zzy",
        },
      },
    ]).store();
    const response = await request(app)
      .get(
        url("advancedmodel", {
          filter: formatFilter({ "object.a": [533, 534] }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model.contents[0].id,
        },
        {
          id: model.contents[1].id,
        },
      ],
    });
    expect(response.body.data.length).toBe(2);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });
  it("should filter with array in oneOf", async () => {
    const dbs = getPool();
    const model = await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 683,
          bcd: "zzz",
          nestedOneOfValues: 1,
        },
      },
      {
        textarray: ["erster", "zweiter"],
        object: {
          a: 684,
          nestedOneOfValues: 2,
          bcd: "zzy",
        },
      },
    ]).store();
    const response = await request(app)
      .get(
        url("advancedmodel", {
          filter: formatFilter({ "object.nestedOneOfValues": [1, 2] }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: model.contents[0].id,
        },
        {
          id: model.contents[1].id,
        },
      ],
    });
    expect(response.body.data.length).toBe(2);
    expect(response.status).toBe(200);
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generateGet({
      prefix: "model",
      Model: Models,
      routeConfig: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") },
      idField: "id",
      extraPathFields: types.obj({}),
    }).options;
    const options2 = generateGet({
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
    await new StrangeIdModels(dbs, [
      {
        id: "test1",
        val: 1,
      },
    ]).store();
    const response = await request(app)
      .get(url("strangemodel"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          id: "test1",
          val: 1,
        },
      ],
    });
    expect(response.status).toBe(200);
    checkType(response, fName);
  });
});

describe("Ids with different name", () => {
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

  it("should put with named id", async () => {
    methods.get[fName] = methods2.get[fName];
    const dbs = getPool();
    await new NamedIdModels(dbs, [
      {
        specialId: 1,
        val: 1,
      },
    ]).store();
    const response = await request(app)
      .get(url("namedid"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toMatchObject({
      data: [
        {
          specialId: 1,
          val: 1,
        },
      ],
    });
    expect(response.status).toBe(200);
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
      get: {
        ...auth.get,
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
      .get(url("modelInjected"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 2,
      data: [
        {
          id: model1.contents[0].id,
        },
        {
          id: model1.contents[2].id,
        },
      ],
    });
    checkType(response, fName);
  });

  test("Get with mapped", async () => {
    const path = "/v/1/modelInjectedMapped";
    addCrud({
      prefix: path,
      app,
      model: Models,
      routes: {
        get: {
          ...auth.get,
          injectParameters: {
            mapped: async () => Promise.resolve(10),
          },
        },
      },
    });

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
    ]).store();

    const response = await request(app)
      .get(url("modelInjectedMapped"))
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 1,
      data: [
        {
          id: model1.contents[0].id,
        },
      ],
    });
    checkType(response, fName);
  });

  test("Try to filter by injected", async () => {
    const response = await request(app)
      .get(
        url("modelInjected", {
          filter: JSON.stringify({ hasDefault: 33 }),
        })
      )
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected object for field "filter" in query')
    );
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
