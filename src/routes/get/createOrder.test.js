const { createOrder } = require("./createOrder");
import { Models } from "../../tests/model";
import { AdvancedModels } from "../../tests/advancedmodel";

describe("order api type", () => {
  test("Should not include derived types", async () => {
    expect(createOrder(Models)).toStrictEqual({
      items: {
        keys: {
          dir: {
            alternatives: [
              {
                value: "ASC",
              },
              {
                value: "DESC",
              },
            ],
            type: "oneOf",
          },
          key: {
            alternatives: [
              {
                value: "id",
              },
              {
                value: "optionalVal",
              },
              {
                value: "someNumber",
              },
            ],
            type: "oneOf",
          },
        },
        type: "object",
      },
      optional: true,
      type: "array",
    });
  });
  test("Should not include arrays, correctly show objects", async () => {
    expect(createOrder(AdvancedModels)).toStrictEqual({
      items: {
        keys: {
          dir: {
            alternatives: [
              {
                value: "ASC",
              },
              {
                value: "DESC",
              },
            ],
            type: "oneOf",
          },
          key: {
            alternatives: [
              {
                value: "id",
              },
              {
                value: "object.a",
              },
              {
                value: "object.bcd",
              },
              {
                value: "object.nestedObj.inner",
              },
              {
                value: "object.nestedOneOf",
              },
              {
                value: "object.nestedOneOfValues",
              },
              {
                value: "object.innerWithDef",
              },
            ],
            type: "oneOf",
          },
        },
        type: "object",
      },
      optional: true,
      type: "array",
    });
  });
});
