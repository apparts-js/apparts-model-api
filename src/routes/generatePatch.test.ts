import * as types from "@apparts/types";
import { Models } from "../tests/model";
import { generatePatch } from "./generatePatch";
import { addCrud } from "../";
import { generateMethods } from "./";
import { validJwt, rejectAccess } from "@apparts/prep";

const fName = "/:id",
  auth = { patch: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") } };
const methods = generateMethods("/v/1/model", Models, auth, undefined, "id");
import { setupTest } from "../tests/";
const { app, url, error, getPool, checkType, allChecked } = setupTest({
  testName: "patch",
  apiContainer: methods.patch,
  schemas: [
    `
CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  "optionalVal" TEXT,
  "hasDefault" INT NOT NULL,
  mapped INT NOT NULL
);

CREATE TABLE multikey (
  id INT NOT NULL,
  "key" TEXT NOT NULL,
  PRIMARY KEY (id, "key")
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
  apiVersion: 1,
});
import request from "supertest";
import { checkJWT, jwt } from "../tests/checkJWT";
import { SubModels } from "../tests/submodel";
import { AdvancedModels } from "../tests/advancedmodel";
import { StrangeIdModels } from "../tests/strangeids";
import { NamedIdModels } from "../tests/namedIdModel";

describe("Patch", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });

  checkJWT(
    () => request(app).patch(url("model/1")).send({ someNumber: 3 }),
    "/:id",
    checkType
  );

  it("should reject without access function", async () => {
    expect(() =>
      generatePatch({
        prefix: "model",
        Model: Models,
        routeConfig: {} as any,
        idField: "id",
        extraPathFields: types.obj({}),
      })
    ).toThrow("Route (patch) model has no access control function.");
  });

  test("Patch with no values", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [{ mapped: 7 }]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({})
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect({ ...model.content, optionalVal: null }).toMatchObject(
      modelNew.content
    );
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);
    checkType(response, fName);

    const model1 = await new Models(dbs).loadOne({ mapped: 7 });
    expect(model1.content).toStrictEqual(modelNew.content);
  });

  test("Patch non-existing model", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [{ mapped: 7 }]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id + 1)))
      .send({
        someNumber: 99,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect({ ...model.content, optionalVal: null }).toMatchObject(
      modelNew.content
    );
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(error("Model not found"));
    checkType(response, fName);
  });

  test("Patch", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [{ mapped: 8 }]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        someNumber: 99,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(response.body).toBe(model.content.id);
    expect(response.status).toBe(200);
    expect(modelNew.content).toMatchObject({
      mapped: 99,
      hasDefault: 7,
    });
    checkType(response, fName);
  });

  test("Patch, set optional value", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [{ mapped: 9 }]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        someNumber: 91,
        optionalVal: "testYes",
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOne({ optionalVal: "testYes" });
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);
    expect(response.body).toBe(modelNew.content.id);
    expect(modelNew.content).toMatchObject({
      mapped: 91,
      hasDefault: 7,
      optionalVal: "testYes",
    });
    checkType(response, fName);
  });

  test("Patch, should leave optional value", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 10,
        optionalVal: "shouldStay",
      },
    ]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        someNumber: 10,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);
    expect(modelNew.content).toMatchObject({
      mapped: 10,
      hasDefault: 7,
      optionalVal: "shouldStay",
    });
    checkType(response, fName);
  });

  test("Patch, remove optional value", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 10,
        optionalVal: "shouldBeGone",
      },
    ]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        someNumber: 10,
        optionalVal: null,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);

    expect(modelNew.content).toMatchObject({
      mapped: 10,
      hasDefault: 7,
    });
    expect(modelNew.content.optionalVal).toBeFalsy();
    checkType(response, fName);
  });

  test("Patch with non-public value", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 10,
      },
    ]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        someNumber: 100,
        hasDefault: 10,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"hasDefault" does not exist'
      )
    );
    checkType(response, fName);
  });

  test("Patch with non existing value", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 11,
      },
    ]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        someNumber: 100,
        rubbish: true,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"rubbish" does not exist'
      )
    );
    checkType(response, fName);
  });

  test("Patch with unmapped value", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 12,
      },
    ]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        mapped: 100,
        someNumber: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"mapped" does not exist'
      )
    );
    checkType(response, fName);
  });
  test("Patch with id", async () => {
    const dbs = getPool();
    const model = await new Models(dbs, [
      {
        mapped: 14,
      },
    ]).store();
    const response = await request(app)
      .patch(url("model/" + String(model.content.id)))
      .send({
        id: 1000,
        someNumber: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(model.content).toMatchObject(modelNew.content);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not alter item because your request had too many parameters",
        '"id" does not exist'
      )
    );
    checkType(response, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: { patch: { hasAccess: rejectAccess } },
  });

  test("Should not grant access on no permission", async () => {
    const responsePatch = await request(app)
      .patch(path + "/4")
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePatch.status).toBe(403);
    expect(responsePatch.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
  });
});

describe("Patch subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud({
    prefix: path,
    app,
    model: SubModels,
    routes: auth,
  });

  test("Patch a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 100 }]).store();
    await new Models(dbs, [{ mapped: 101 }]).store();
    const submodel = await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    const response = await request(app)
      .patch(
        url(
          `model/${String(model1.content.id)}/submodel/${String(
            submodel.content.id
          )}`
        )
      )
      .send({ opt: "exists now" })
      .set("Authorization", "Bearer " + jwt());
    const submodelNew = await new SubModels(dbs).loadOne({});
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
      opt: "exists now",
    });
    checkType(response, fName);
  });

  test("Patch a subresouce with correct id", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 100 }]).store();
    const submodel = await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    const response = await request(app)
      .patch(
        url(
          `model/${String(model1.content.id)}/submodel/${String(
            submodel.content.id
          )}`
        )
      )
      .send({ opt: "exists", modelId: model1.content.id })
      .set("Authorization", "Bearer " + jwt());
    const submodelNew = await new SubModels(dbs).loadOneByKeys({
      id: submodel.content.id,
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
      opt: "exists",
    });
    expect(submodel.content.opt).toBeFalsy();
    checkType(response, fName);
  });

  test("Patch a subresouce with wrong id", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 100 }]).store();
    const model2 = await new Models(dbs, [{ mapped: 101 }]).store();
    const submodel = await new SubModels(dbs, [
      {
        modelId: model1.content.id,
      },
    ]).store();
    const response = await request(app)
      .patch(
        url(
          `model/${String(model1.content.id)}/submodel/${String(
            submodel.content.id
          )}`
        )
      )
      .send({ opt: "exists now", modelId: model2.content.id })
      .set("Authorization", "Bearer " + jwt());
    const submodelNew = await new SubModels(dbs).loadOneByKeys({
      id: submodel.content.id,
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Could not alter item because it would change a path id")
    );
    expect(submodelNew.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
    });
    expect(submodel.content.opt).toBeFalsy();
    checkType(response, fName);
  });
});

describe("patch subresources with optional relation", () => {
  const path = "/v/1/:optionalVal/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });
  const methods2 = generateMethods(path, Models, auth, undefined, "id");

  test("Should patch a subresouce", async () => {
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
      .patch(url(`test123/model/${String(submodel.content.id)}`))
      .send({ someNumber: 1222 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    checkType(response, fName);
    const modelNew = await new Models(dbs).loadOneByKeys({
      id: submodel.content.id,
    });
    expect(modelNew.content).toMatchObject({
      mapped: 1222,
      optionalVal: "test123",
    });
  });
});

describe("patch advanced model", () => {
  const path = "/v/1/advancedmodel";

  addCrud({
    prefix: path,
    app,
    model: AdvancedModels,
    routes: auth,
  });

  test("Should update model", async () => {
    const dbs = getPool();
    const model1 = await new AdvancedModels(dbs, [
      {
        textarray: ["erster", "zweiter"],
        object: { a: 22, bcd: "jup", innerWithDef: "bla" },
      },
    ]).store();

    const response = await request(app)
      .patch(url(`advancedmodel/` + String(model1.content.id)))
      .send({
        textarray: ["dritter", "vierter"],
        object: { a: 23, bcd: "nope" },
      })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toBe(model1.content.id);
    const modelNew = await new AdvancedModels(dbs).loadOneByKeys({
      id: model1.content.id,
    });
    expect(modelNew.content).toMatchObject({
      textarray: ["dritter", "vierter"],
      object: { a: 23, bcd: "nope", innerWithDef: "the default" },
    });
    checkType(response, fName);
  });

  test("Patch, leave other values in tact", async () => {
    const dbs = getPool();
    const model = await new AdvancedModels(dbs, [
      {
        textarray: ["a", "b"],
        object: { a: 2, bcd: "test", innerWithDef: "bla" },
      },
    ]).store();
    const response = await request(app)
      .patch(url("advancedmodel/" + String(model.content.id)))
      .send({
        textarray: ["c"],
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new AdvancedModels(dbs).loadOneByKeys({
      id: model.content.id,
    });
    expect(response.body).toBe(model.content.id);
    expect(response.status).toBe(200);
    expect(modelNew.content).toMatchObject({
      ...model.content,
      textarray: ["c"],
    });
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generatePatch({
      prefix: "model",
      Model: Models,
      routeConfig: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") },
      idField: "id",
      extraPathFields: types.obj({}),
    }).options;
    const options2 = generatePatch({
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
    expect(options1.title).toBe("Patch Model");
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

  it("should patch with other id format", async () => {
    methods.patch[fName] = methods2.patch[fName];
    const dbs = getPool();
    const model1 = await new StrangeIdModels(dbs, [
      {
        id: "test1",
        val: 1,
      },
    ]).store();
    const response = await request(app)
      .patch(url("strangemodel/" + model1.content.id))
      .send({ val: 2 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe("test1");
    expect(response.status).toBe(200);
    const model2 = await new StrangeIdModels(dbs).loadOne({
      id: "test1",
    });
    expect(model2.content).toMatchObject({
      id: "test1",
      val: 2,
    });
    checkType(response, fName);
  });
});

describe("Ids with different name", () => {
  const fName = "/:specialId";
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

  it("should patch with named id", async () => {
    methods.patch[fName] = methods2.patch[fName];
    const dbs = getPool();
    const model1 = await new NamedIdModels(dbs, [
      {
        specialId: 1,
        val: 1,
      },
    ]).store();
    const response = await request(app)
      .patch(url("namedid/" + String(model1.content.specialId)))
      .send({ val: 2 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.body).toBe(1);
    expect(response.status).toBe(200);
    const model2 = await new NamedIdModels(dbs).loadOne({
      specialId: 1,
    });
    expect(model2.content).toMatchObject({
      specialId: 1,
      val: 2,
    });
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
      patch: {
        ...auth.patch,
        injectParameters: {
          hasDefault: async () => Promise.resolve(12),
        },
      },
    },
  });
  const methods2 = generateMethods(path, Models, auth, undefined, "id");

  beforeAll(() => {
    methods.patch[fName] = methods2.patch[fName];
  });

  beforeEach(async () => {
    await new SubModels(getPool()).delete({});
    await new Models(getPool()).delete({});
  });

  test("Patch if param matches", async () => {
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
      .patch(url("modelInjected/" + String(model1.contents[0].id)))
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);
    expect(response.body).toBe(model1.contents[0].id);

    await new Models(dbs).loadOne({
      mapped: 99,
    });
    checkType(response, fName);
  });

  test("Do not patch if param does not match", async () => {
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
      .patch(url("modelInjected/" + String(model1.contents[1].id)))
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(error("ModelInjected not found"));

    await new Models(dbs).loadNone({
      mapped: 99,
    });
    checkType(response, fName);
  });

  test("Refuse request with injected param in body", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [
      {
        mapped: 10,
        hasDefault: 13,
      },
    ]).store();

    const response = await request(app)
      .patch(url("modelInjected/" + String(model1.contents[0].id)))
      .send({ hasDefault: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error("Could not alter item because your request had too many parameters")
    );

    await new Models(dbs).loadNone({
      hasDefault: 99,
    });
    checkType(response, fName);
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
