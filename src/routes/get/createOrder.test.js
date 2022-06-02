const { createOrder } = require("./createOrder");
const { useModel } = require("../../tests/model.js");
const { useAdvancedModel } = require("../../tests/advancedmodel.js");

describe("order api type", () => {
  test("Should not include derived types", async () => {
    expect(createOrder(useModel)).toStrictEqual({
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
    expect(createOrder(useAdvancedModel)).toStrictEqual({
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
