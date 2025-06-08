import { Models } from "../tests/model";
import { generatePost } from "./generatePost";
import { addCrud } from "../";
import { generateMethods } from "./";
import { validJwt, rejectAccess } from "@apparts/prep";

const fName = "";
const path = "/v/1/model",
  auth = { post: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") } };

const methods = generateMethods(path, Models, auth, undefined, "id");

import setupTest from "@apparts/backend-test";
const { app, url, error, getPool, checkType, allChecked } = setupTest({
  testName: "post",
  apiContainer: methods.post,
  apiVersion: 1,
  schemas: [
    `
CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  "optionalVal" TEXT,
  "hasDefault" INT NOT NULL,
  mapped INT NOT NULL
);

CREATE TABLE "modelWithDefault" (
  id SERIAL PRIMARY KEY,
  "optionalVal" TEXT,
  "hasDefault" INT NOT NULL,
  "hasReadOnlyWithDefault" INT,
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
import { ModelsWithDefault } from "../tests/modelWithDefault";
import { StrangeIdModels } from "../tests/strangeids";
import { NamedIdModels } from "../tests/namedIdModel";
import { MultiModels } from "../tests/multiKeyModel";

describe("Post", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });

  checkJWT(
    () => request(app).post(url("model")).send({ someNumber: 3 }),
    fName,
    checkType
  );

  it("should reject without access function", async () => {
    expect(() =>
      generatePost({
        prefix: "model",
        Model: Models,
        routeConfig: {} as any,
        idField: "id",
      })
    ).toThrow("Route (post) model has no access control function.");
  });

  test("Post with too few values", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({})
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({});
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(error("Fieldmissmatch"));
    checkType(response, fName);
  });

  test("Post", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({
        someNumber: 99,
      })
      .set("Authorization", "Bearer " + jwt());
    const model = await new Models(dbs).loadOne({});
    expect(response.body).toBe(model.content.id);
    expect(response.status).toBe(200);
    expect(model.content).toMatchObject({
      mapped: 99,
      hasDefault: 7,
      optionalVal: null,
    });
    checkType(response, fName);
  });

  test("Post with optional value", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({
        someNumber: 91,
        optionalVal: "testYes",
      })
      .set("Authorization", "Bearer " + jwt());
    const model = await new Models(dbs).loadOne({ optionalVal: "testYes" });
    expect(response.status).toBe(200);
    expect(response.body).toBe(model.content.id);
    expect(model.content).toMatchObject({
      mapped: 91,
      hasDefault: 7,
      optionalVal: "testYes",
    });
    checkType(response, fName);
  });

  test("Post with non-public value", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({
        someNumber: 100,
        hasDefault: 10,
      })
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ mapped: 100 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not create item because your request had too many parameters",
        '"hasDefault" does not exist'
      )
    );
    checkType(response, fName);
  });

  test("Post with non existing value", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({
        someNumber: 100,
        rubbish: true,
      })
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ mapped: 100 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not create item because your request had too many parameters",
        '"rubbish" does not exist'
      )
    );
    checkType(response, fName);
  });

  test("Post with unmapped value", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({
        mapped: 100,
        someNumber: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ mapped: 100 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not create item because your request had too many parameters",
        '"mapped" does not exist'
      )
    );
    checkType(response, fName);
    const response2 = await request(app)
      .post(url("model"))
      .send({
        mapped: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ mapped: 100 });
    expect(response2.status).toBe(400);
    expect(response2.body).toMatchObject(error("Fieldmissmatch"));
    checkType(response2, fName);
  });
  test("Post with id", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({
        id: 1000,
        someNumber: 100,
      })
      .set("Authorization", "Bearer " + jwt());
    await new Models(dbs).loadNone({ mapped: 100 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(
      error(
        "Could not create item because your request had too many parameters",
        '"id" does not exist'
      )
    );
    checkType(response, fName);
  });
});

describe("Post", () => {
  const path = "/v/1/model2";
  addCrud({
    prefix: path,
    app,
    model: ModelsWithDefault,
    routes: auth,
  });

  checkJWT(
    () => request(app).post(url("model")).send({ someNumber: 3 }),
    fName,
    checkType
  );
  test("Should post with default", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model2"))
      .send({
        someNumber: 100,
        hasDefault: 9,
      })
      .set("Authorization", "Bearer " + jwt());
    const model = await new ModelsWithDefault(dbs).loadOne({ mapped: 100 });
    expect(response.body).toBe(model.content.id);
    expect(response.status).toBe(200);
    expect(model.content).toMatchObject({
      mapped: 100,
      hasDefault: 9,
      optionalVal: null,
    });
    checkType(response, fName);
  });
  test("Should post without default", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model2"))
      .send({
        someNumber: 101,
      })
      .set("Authorization", "Bearer " + jwt());
    const model = await new ModelsWithDefault(dbs).loadOne({ mapped: 101 });
    expect(response.body).toBe(model.content.id);
    expect(response.status).toBe(200);
    expect(model.content).toMatchObject({
      mapped: 101,
      hasDefault: 7,
      optionalVal: null,
    });
    checkType(response, fName);
  });
});

describe("Check authorization", () => {
  const path = "/v/1/modelauth";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: { post: { hasAccess: rejectAccess } },
  });

  test("Should not grant access on no permission", async () => {
    const responsePost = await request(app)
      .post(path)
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePost.status).toBe(403);
    expect(responsePost.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
  });
});

describe("Post multikey", () => {
  const path = "/v/1/multimodel";
  addCrud({
    prefix: path,
    app,
    model: MultiModels,
    routes: auth,
  });

  test("Post with multi key", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("multimodel"))
      .send({
        id: 1000,
        key: "myKey",
      })
      .set("Authorization", "Bearer " + jwt());
    const model = await new MultiModels(dbs).loadOne({});
    expect(model.content).toMatchObject({ id: 1000, key: "myKey" });
    expect(response.status).toBe(200);
    expect(response.body).toBe(1000);
    checkType(response, fName);
  });

  test("Post with key collision", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("multimodel"))
      .send({
        id: 1000,
        key: "myKey",
      })
      .set("Authorization", "Bearer " + jwt());
    await new MultiModels(dbs).loadOne({});
    expect(response.status).toBe(412);
    expect(response.body).toMatchObject(
      error("Could not create item because it exists")
    );
    checkType(response, fName);
  });
});

describe("Post subresources", () => {
  const path = "/v/1/model/:modelId/submodel";
  addCrud({
    prefix: path,
    app,
    model: SubModels,
    routes: auth,
  });

  test("Post a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Models(dbs, [{ mapped: 100 }]).store();
    await new Models(dbs, [{ mapped: 101 }]).store();
    const response = await request(app)
      .post(url(`model/${model1.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    const submodel = await new SubModels(dbs).loadOne({});
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    expect(submodel.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
    });
    checkType(response, fName);
  });
});

describe("Post subresources with optional relation", () => {
  const path = "/v/1/:optionalVal/model";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: auth,
  });

  test("Should post a subresouce", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url(`test123/model`))
      .send({
        someNumber: 1221,
      })
      .set("Authorization", "Bearer " + jwt());
    expect(response.status).toBe(200);

    const submodel = await new Models(dbs).loadOne({ id: response.body });
    expect(submodel.content).toMatchObject({
      id: submodel.content.id,
      optionalVal: "test123",
      mapped: 1221,
    });
    checkType(response, fName);
  });
});

describe("post advanced model", () => {
  const path = "/v/1/advancedmodel";
  addCrud({
    prefix: path,
    app,
    model: AdvancedModels,
    routes: auth,
  });

  test("Should create model", async () => {
    const dbs = getPool();

    const response = await request(app)
      .post(url(`advancedmodel`))
      .send({
        textarray: ["dritter", "vierter"],
        object: { a: 23, bcd: "nope" },
      })
      .set("Authorization", "Bearer " + jwt());
    const modelNew = await new AdvancedModels(dbs).loadOne({});
    expect(response.status).toBe(200);
    expect(response.body).toBe(modelNew.content.id);

    expect(modelNew.content).toMatchObject({
      textarray: ["dritter", "vierter"],
      object: { a: 23, bcd: "nope" },
    });
    checkType(response, fName);
  });
});

describe("Title and description", () => {
  test("Should set default title", async () => {
    const options1 = generatePost({
      prefix: "model",
      Model: Models,
      routeConfig: { hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst") },
      idField: "id",
    }).options;
    const options2 = generatePost({
      prefix: "model",
      Model: Models,
      routeConfig: {
        title: "My title",
        description: "yay",
        hasAccess: validJwt("rsoaietn0932lyrstenoie3nrst"),
      },
      idField: "id",
    }).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Create Model");
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

  it("should post with other id format", async () => {
    methods.post[fName] = methods2.post[fName];
    const dbs = getPool();
    const response = await request(app)
      .post(url("strangemodel"))
      .send({ id: "test1", val: 2 })
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
    methods.post[fName] = methods2.post[fName];
    const dbs = getPool();
    const response = await request(app)
      .post(url("namedid"))
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

test("All possible responses tested", () => {
  allChecked(fName);
});
