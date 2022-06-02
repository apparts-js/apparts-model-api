const { createBody } = require("./common");
const { useModel } = require("../tests/model.js");
const { makeModel, useModel: _useModel } = require("@apparts/model");
const {
  addCrud,
  accessLogic: { anybody, and, andS, or, orS },
} = require("../");
const { generateMethods } = require("./");
const methods = generateMethods(
  "/v/1/model",
  useModel,
  {
    get: anybody,
    getByIds: anybody,
    post: anybody,
    put: anybody,
    delete: anybody,
  },
  "",
  undefined,
  "id"
);

const { app, error, checkType } = require("@apparts/backend-test")({
  testName: "common",
  apiContainer: {
    get: methods.get[""],
    getByIds: methods.get["/:ids"],
    post: methods.post[""],
    put: methods.put["/:id"],
    delete: methods.delete["/:ids"],
  },
  apiVersion: 1,
  schemas: [
    `
    CREATE TABLE model (
      id SERIAL PRIMARY KEY,
      "optionalVal" TEXT,
      "hasDefault" INT NOT NULL,
      mapped INT NOT NULL
    );`,
  ],
});
const request = require("supertest");
const { jwt } = require("../tests/checkJWT");

describe("No functions", () => {
  const path = "/v/1/model1";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: {},
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should not generate any function", async () => {
    const responsePost = await request(app)
      .post(path)
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePost.status).toBe(404);
    expect(responsePost.get("Content-Type")).toBe("text/html; charset=utf-8");

    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt());
    expect(responseGet.status).toBe(404);
    expect(responseGet.get("Content-Type")).toBe("text/html; charset=utf-8");

    const responseGetById = await request(app)
      .get(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseGetById.status).toBe(404);
    expect(responseGetById.get("Content-Type")).toBe(
      "text/html; charset=utf-8"
    );

    const responsePut = await request(app)
      .put(path + "/4")
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePut.status).toBe(404);
    expect(responsePut.get("Content-Type")).toBe("text/html; charset=utf-8");

    const responseDel = await request(app)
      .delete(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseDel.status).toBe(404);
    expect(responseDel.get("Content-Type")).toBe("text/html; charset=utf-8");
  });
});

describe("Anybody", () => {
  const path = "/v/1/model2";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: {
      get: { access: anybody },
      getByIds: { access: anybody },
      post: { access: anybody },
      put: { access: anybody },
      delete: { access: anybody },
    },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should grant access to anybody on all functions", async () => {
    const responsePost = await request(app)
      .post(path)
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePost.status).toBe(200);
    checkType(responsePost, "post");

    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt());
    expect(responseGet.status).toBe(200);
    checkType(responseGet, "get");

    const responseGetById = await request(app)
      .get(path + "/" + JSON.stringify([responsePost.body]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseGetById.status).toBe(200);
    checkType(responseGetById, "getByIds");

    const responsePut = await request(app)
      .put(path + "/" + responsePost.body)
      .send({ someNumber: 99 })
      .set("Authorization", "Bearer " + jwt());
    expect(responsePut.status).toBe(200);
    checkType(responsePut, "put");

    const responseDel = await request(app)
      .delete(path + "/" + JSON.stringify([responsePost.body]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseDel.status).toBe(200);
    checkType(responseDel, "delete");
  });
});

describe("accessFunc return values", () => {
  const path = "/v/1/model3";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: {
      get: {
        access: async () =>
          new Promise((res) => setTimeout(() => res(true), 100)),
      },
      getByIds: {
        access: async () =>
          new Promise((res) => setTimeout(() => res(false), 100)),
      },
    },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should accpet with Promise", async () => {
    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt());
    expect(responseGet.status).toBe(200);
    checkType(responseGet, "get");
  });
  test("Should reject with Promise", async () => {
    const responseGetById = await request(app)
      .get(path + "/" + JSON.stringify([4]))
      .set("Authorization", "Bearer " + jwt());
    expect(responseGetById.status).toBe(403);
    expect(responseGetById.body).toMatchObject(
      error("You don't have the rights to retrieve this.")
    );
    checkType(responseGetById, "getByIds");
  });
});

describe("accessFunc should have request, dbs, me", () => {
  const path = "/v/1/model4";
  addCrud({
    prefix: path,
    app,
    model: useModel,
    routes: {
      get: {
        access: async ({ dbs }, me) => {
          await dbs.raw("SELECT 3");
          return me.name === "Norris";
        },
      },
    },
    webtokenkey: "rsoaietn0932lyrstenoie3nrst",
  });

  test("Should accpet with correct name", async () => {
    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt({ name: "Norris" }));
    expect(responseGet.status).toBe(200);
    checkType(responseGet, "get");
  });
  test("Should reject with wrong name", async () => {
    const responseGet = await request(app)
      .get(path)
      .set("Authorization", "Bearer " + jwt({ name: "Duck" }));
    expect(responseGet.status).toBe(403);
    checkType(responseGet, "get");
  });
});

describe("and", () => {
  test("Should give true", async () => {
    const res = await and(
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      },
      () => true,
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      }
    )({ iAmHere: true }, { iAmHereToo: true });
    expect(res).toBe(true);
  });

  test("Should give false", async () => {
    const res = await and(
      () => false,
      () => true,
      () => true
    )();
    expect(res).toBe(false);
    const res2 = await and(
      () => true,
      () => false,
      () => true
    )();
    expect(res2).toBe(false);
    const res3 = await and(
      () => true,
      () => true,
      () => false
    )();
    expect(res3).toBe(false);
    const res4 = await and(
      () => false,
      () => false,
      () => false
    )();
    expect(res4).toBe(false);
  });

  test("Should be true with promise", async () => {
    const res = await and(
      async () => new Promise((res) => setTimeout(() => res(true), 10))
    )();
    expect(res).toBe(true);
  });
  test("Should be false with promise", async () => {
    const res = await and(
      async () => new Promise((res) => setTimeout(() => res(true), 10)),
      async () => new Promise((res) => setTimeout(() => res(false), 20))
    )();
    expect(res).toBe(false);
  });
});

describe("andS", () => {
  test("Should give true", async () => {
    const res = await andS(
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      },
      () => true,
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      }
    )({ iAmHere: true }, { iAmHereToo: true });
    expect(res).toBe(true);
  });

  test("Should give false", async () => {
    const res = await andS(
      () => false,
      () => true,
      () => true
    )();
    expect(res).toBe(false);
    const res2 = await andS(
      () => true,
      () => false,
      () => true
    )();
    expect(res2).toBe(false);
    const res3 = await andS(
      () => true,
      () => true,
      () => false
    )();
    expect(res3).toBe(false);
    const res4 = await andS(
      () => false,
      () => false,
      () => false
    )();
    expect(res4).toBe(false);
  });

  test("Should be true with promise", async () => {
    const res = await andS(
      async () => new Promise((res) => setTimeout(() => res(true), 10))
    )();
    expect(res).toBe(true);
  });
  test("Should be false with promise", async () => {
    const res = await andS(
      async () => new Promise((res) => setTimeout(() => res(true), 10)),
      async () => new Promise((res) => setTimeout(() => res(false), 20))
    )();
    expect(res).toBe(false);
  });
});

describe("or", () => {
  test("Should pass on parameters", async () => {
    const res = await or(
      () => false,
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      }
    )({ iAmHere: true }, { iAmHereToo: true });
    expect(res).toBe(true);
    const res2 = await or(
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      },
      () => false
    )({ iAmHere: true }, { iAmHereToo: true });
    expect(res2).toBe(true);
  });

  test("Should give true", async () => {
    const res = await or(
      () => false,
      () => true,
      () => true
    )();
    expect(res).toBe(true);
    const res2 = await or(
      () => true,
      () => false,
      () => true
    )();
    expect(res2).toBe(true);
    const res3 = await or(
      () => true,
      () => true,
      () => false
    )();
    expect(res3).toBe(true);
  });

  test("Should give false", async () => {
    const res = await or(
      () => false,
      () => false,
      () => false
    )();
    expect(res).toBe(false);
  });

  test("Should be true with promise", async () => {
    const res = await or(
      async () => new Promise((res) => setTimeout(() => res(false), 10)),
      async () => new Promise((res) => setTimeout(() => res(true), 20))
    )();
    expect(res).toBe(true);
  });
  test("Should be false with promise", async () => {
    const res = await or(
      async () => new Promise((res) => setTimeout(() => res(false), 10))
    )();
    expect(res).toBe(false);
  });
});

describe("orS", () => {
  test("Should pass on parameters", async () => {
    const res = await orS(
      () => false,
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      }
    )({ iAmHere: true }, { iAmHereToo: true });
    expect(res).toBe(true);
    const res2 = await orS(
      (a, b) => {
        return a.iAmHere && b.iAmHereToo;
      },
      () => false
    )({ iAmHere: true }, { iAmHereToo: true });
    expect(res2).toBe(true);
  });

  test("Should give true", async () => {
    const res = await orS(
      () => false,
      () => true,
      () => true
    )();
    expect(res).toBe(true);
    const res2 = await orS(
      () => true,
      () => false,
      () => true
    )();
    expect(res2).toBe(true);
    const res3 = await orS(
      () => true,
      () => true,
      () => false
    )();
    expect(res3).toBe(true);
  });

  test("Should give false", async () => {
    const res = await orS(
      () => false,
      () => false,
      () => false
    )();
    expect(res).toBe(false);
  });

  test("Should be true with promise", async () => {
    const res = await orS(
      async () => new Promise((res) => setTimeout(() => res(false), 10)),
      async () => new Promise((res) => setTimeout(() => res(true), 20))
    )();
    expect(res).toBe(true);
  });
  test("Should be false with promise", async () => {
    const res = await orS(
      async () => new Promise((res) => setTimeout(() => res(false), 10))
    )();
    expect(res).toBe(false);
  });
});

describe("createBody", () => {
  test("Should not produce derived values in body", async () => {
    expect(createBody("", useModel)).toStrictEqual({
      optionalVal: {
        optional: true,
        type: "string",
      },
      someNumber: {
        type: "int",
      },
    });
  });

  test("Should not produce readOnly values in body", async () => {
    const [Models, Model, NoModel] = _useModel(
      {
        id: {
          type: "id",
          public: true,
          auto: true,
          key: true,
        },
        val: {
          type: "string",
          public: true,
        },
        created: {
          type: "time",
          default: () => 100,
          public: true,
          readOnly: true,
        },
      },
      "modelWithReadOnly"
    );
    const { useMyModel } = makeModel("MyModel", [Models, Model, NoModel]);
    expect(createBody("", useMyModel)).toStrictEqual({
      val: { type: "string" },
    });
  });
});
