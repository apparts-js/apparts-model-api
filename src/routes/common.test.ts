import request from "supertest";
import { jwt } from "../tests/checkJWT";

import * as types from "@apparts/types";
import { createBody, createParams } from "./common";
import { Models } from "../tests/model";
import { useModel, BaseModel } from "@apparts/model";
import {
  useChecks,
  anybody,
  rejectAccess,
  accessFn,
  jwtAnd as _jwtAnd,
} from "@apparts/prep";
import { setupTest } from "../tests/";
import { addCrud } from "../";
const jwtAnd = _jwtAnd("rsoaietn0932lyrstenoie3nrst");
import { generateMethods } from "./";
import { GenericQueriable } from "@apparts/db";
const methods = generateMethods(
  "/v/1/model",
  Models,
  {
    get: { hasAccess: anybody },
    getByIds: { hasAccess: anybody },
    post: { hasAccess: anybody },
    put: { hasAccess: anybody },
    delete: { hasAccess: anybody },
  },
  undefined,
  "id"
);

const { app, error, checkType } = setupTest({
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

describe("No functions", () => {
  const path = "/v/1/model1";
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes: {},
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
    model: Models,
    routes: {
      get: { hasAccess: anybody },
      getByIds: { hasAccess: anybody },
      post: { hasAccess: anybody },
      put: { hasAccess: anybody },
      delete: { hasAccess: anybody },
    },
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
      .put(path + "/" + String(responsePost.body))
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
  const routes = {
    get: {
      hasAccess: jwtAnd(
        () => new Promise((res) => setTimeout(() => res(), 100))
      ),
    },
    getByIds: {
      hasAccess: jwtAnd(rejectAccess),
    },
  };
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes,
  });
  const methods = generateMethods("/", Models, routes, undefined, "id");
  const { checkType } = useChecks({
    get: methods.get[""],
    getByIds: methods.get["/:ids"],
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
  const routes = {
    get: {
      hasAccess: jwtAnd(
        accessFn({
          fn: async (req, me) => {
            const { dbs } = req as typeof req & {
              dbs: GenericQueriable;
            };
            await dbs.raw("SELECT 3");
            if ((me as { name: string }).name !== "Norris") {
              rejectAccess();
            }
          },
          description: "is Chuck Norris",
          returns: rejectAccess.returns,
        })
      ),
    },
  };
  addCrud({
    prefix: path,
    app,
    model: Models,
    routes,
  });
  const methods = generateMethods("/", Models, routes, undefined, "id");
  const { checkType } = useChecks({
    get: methods.get[""],
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

describe("createBody", () => {
  test("Should not produce derived values in body", async () => {
    const params = createParams("", Models.getSchema(), types.obj({}));
    expect(createBody(params, Models, [])).toStrictEqual({
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
    const typeSchema = types.obj({
      id: types.int().semantic("id").key().auto().public(),
      val: types.string().public(),
      created: types
        .int()
        .semantic("time")
        .default(() => 100)
        .public()
        .readOnly(),
    });
    class Models extends BaseModel<any> {}
    useModel(Models, {
      collection: "modelWithReadOnly",
      typeSchema,
    });
    const params = createParams("", typeSchema, types.obj({}));
    expect(createBody(params, Models, [])).toStrictEqual({
      val: { type: "string" },
    });
  });

  test("Should handle optional params when creating body", async () => {
    const typeSchema = types.obj({
      id: types.int().semantic("id").public(),
      val: types.string().public(),
    });
    class Models extends BaseModel<any> {}
    useModel(Models, {
      collection: "modelWithReadOnly",
      typeSchema,
    });
    const params = createParams(":val", typeSchema, types.obj({}));
    expect(createBody(params, Models, [])).toStrictEqual({
      id: { type: "int", semantic: "id" },
    });
  });

  test("Should throw on unknown path fields", async () => {
    expect(() =>
      generateMethods(
        "/v/1/abc/:custom/model",
        Models,
        {
          get: { hasAccess: anybody },
          getByIds: { hasAccess: anybody },
          post: { hasAccess: anybody },
          put: { hasAccess: anybody },
          delete: { hasAccess: anybody },
        },
        undefined,
        "id"
      )
    ).toThrowError(
      `Param custom not known in model for path /v/1/abc/:custom/model`
    );
  });

  test("Should ignore ignored path fields", async () => {
    const customParams = types.obj({ custom: types.string() });
    const methods = generateMethods(
      "/v/1/abc/:custom/model",
      Models,
      {
        get: { hasAccess: anybody },
        getByIds: { hasAccess: anybody },
        post: { hasAccess: anybody },
        put: { hasAccess: anybody },
        delete: { hasAccess: anybody },
      },
      undefined,
      "id",
      customParams
    );
    expect(methods.get[""].assertions).toMatchObject({
      params: { custom: { type: "string" } },
    });

    expect(
      createParams(
        "/v/1/abc/:custom/model/:id",
        Models.getSchema(),
        customParams
      )
    ).toMatchObject({
      custom: { type: "string" },
      id: { type: "int" },
    });
  });

  test("Should throw on unknown ignored path field", async () => {
    expect(() =>
      generateMethods(
        "/v/1/model",
        Models,
        {
          get: { hasAccess: anybody },
          getByIds: { hasAccess: anybody },
          post: { hasAccess: anybody },
          put: { hasAccess: anybody },
          delete: { hasAccess: anybody },
        },
        undefined,
        "id",
        types.obj({ custom: types.string() })
      )
    ).toThrowError(
      `Cannot ignore field "custom" in path "/v/1/model" because it does not exist in the path.`
    );
  });

  test("Should throw on custom path field that overlaps with params", async () => {
    expect(() =>
      generateMethods(
        "/v/1/:id/model",
        Models,
        {
          get: { hasAccess: anybody },
          getByIds: { hasAccess: anybody },
          post: { hasAccess: anybody },
          put: { hasAccess: anybody },
          delete: { hasAccess: anybody },
        },
        undefined,
        "id",
        types.obj({ id: types.string() })
      )
    ).toThrowError('Custom param "id" overlaps with other path parameters.');
  });
});
