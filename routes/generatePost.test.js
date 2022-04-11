const { NoModel, Model, useModel } = require("../tests/model.js");
const generatePost = require("./generatePost");
const {
  addCrud,
  accessLogic: { anybody },
} = require("../");
const { generateMethods } = require("./");

const fName = "";
const path = "/v/1/model",
  auth = { post: anybody };

const methods = generateMethods(path, useModel, auth, "");
const { app, url, error, getPool, checkType, allChecked } =
  require("@apparts/backend-test")({
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
);`,
    ],
  });
const request = require("supertest");
const { checkJWT, jwt } = require("../tests/checkJWT");
const { SubModel, useSubModel } = require("../tests/submodel.js");
const { MultiModel, useMultiModel } = require("../tests/multiKeyModel.js");
const {
  AdvancedModel,
  useAdvancedModel,
} = require("../tests/advancedmodel.js");
const { useModelWithDefault } = require("../tests/modelWithDefault.js");

describe("Post", () => {
  const path = "/v/1/model";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  checkJWT(
    () => request(app).post(url("model")).send({ someNumber: 3 }),
    fName,
    checkType
  );
  test("Post with too few values", async () => {
    const dbs = getPool();
    const response = await request(app)
      .post(url("model"))
      .send({})
      .set("Authorization", "Bearer " + jwt());
    await new NoModel(dbs).loadNone({});
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
    const model = await new Model(dbs).load({});
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
    const model = await new Model(dbs).load({ optionalVal: "testYes" });
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
    await new NoModel(dbs).loadNone({ mapped: 100 });
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
    await new NoModel(dbs).loadNone({ mapped: 100 });
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
    await new NoModel(dbs).loadNone({ mapped: 100 });
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
    await new NoModel(dbs).loadNone({ mapped: 100 });
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
    await new NoModel(dbs).loadNone({ mapped: 100 });
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
    model: useModelWithDefault,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
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
    const model = await new Model(dbs).load({ mapped: 100 });
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
    const model = await new Model(dbs).load({ mapped: 101 });
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
    model: useModel,
    routes: { post: { access: () => false } },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
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

    checkType(responsePost, fName);
  });
});

describe("Post multikey", () => {
  const path = "/v/1/multimodel";
  addCrud({
    prefix: path,
    app,
    model: useMultiModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
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
    const model = await new MultiModel(dbs).load({});
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
    await new MultiModel(dbs).load({});
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
    model: useSubModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Post a subresouce", async () => {
    const dbs = getPool();
    const model1 = await new Model(dbs, { mapped: 100 }).store();
    await new Model(dbs, { mapped: 101 }).store();
    const response = await request(app)
      .post(url(`model/${model1.content.id}/submodel`))
      .set("Authorization", "Bearer " + jwt());
    const submodel = await new SubModel(dbs).load({});
    expect(response.status).toBe(200);
    expect(response.body).toBe(submodel.content.id);
    expect(submodel.content).toMatchObject({
      id: submodel.content.id,
      modelId: model1.content.id,
    });
    checkType(response, fName);
  });
});

describe("post advanced model", () => {
  const path = "/v/1/advancedmodel";
  addCrud({
    prefix: path,
    app,
    model: useAdvancedModel,
    routes: auth,
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
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
    const modelNew = await new AdvancedModel(dbs).load({});
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
    const options1 = generatePost("model", useModel, {}, "").options;
    const options2 = generatePost(
      "model",
      useModel,
      { title: "My title", description: "yay" },
      ""
    ).options;
    expect(options1.description).toBeFalsy();
    expect(options1.title).toBe("Create Model");
    expect(options2.title).toBe("My title");
    expect(options2.description).toBe("yay");
  });
});

test("All possible responses tested", () => {
  allChecked(fName);
});
