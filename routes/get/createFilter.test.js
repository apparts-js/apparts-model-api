const { createFilter } = require("./createFilter");
const { useModel } = require("../../tests/model.js");
const { useAdvancedModel } = require("../../tests/advancedmodel.js");

describe("filter api type", () => {
  const numberAlternatives = {
    alternatives: [
      {
        type: "int",
      },
      {
        type: "object",
        keys: {
          gt: {
            optional: true,
            type: "int",
          },
          gte: {
            optional: true,
            type: "int",
          },
          lt: {
            optional: true,
            type: "int",
          },
          lte: {
            optional: true,
            type: "int",
          },
        },
      },
    ],
    optional: true,
    type: "oneOf",
  };
  const idAlternatives = {
    alternatives: [
      {
        type: "id",
      },
    ],
    optional: true,
    type: "oneOf",
  };
  const stringAlternatives = {
    alternatives: [
      {
        type: "string",
      },
      {
        keys: {
          like: {
            type: "string",
          },
        },
        type: "object",
      },
    ],
    optional: true,
    type: "oneOf",
  };
  test("Should not include derived types", async () => {
    expect(createFilter("", useModel)).toStrictEqual({
      keys: {
        id: idAlternatives,
        optionalVal: stringAlternatives,
        someNumber: numberAlternatives,
      },
      optional: true,
      type: "object",
    });
  });
  test("Should not include arrays, correctly show objects", async () => {
    expect(createFilter("", useAdvancedModel)).toStrictEqual({
      keys: {
        id: idAlternatives,
        "object.a": numberAlternatives,
        "object.bcd": stringAlternatives,
        "object.nestedObj.inner": stringAlternatives,
        "object.nestedOneOf": {
          alternatives: [
            {
              type: "string",
            },
            {
              type: "int",
            },
          ],
          optional: true,
          type: "oneOf",
        },
        "object.nestedOneOfValues": {
          alternatives: [{ value: 1 }, { value: 2 }],
          optional: true,
          type: "oneOf",
        },
      },
      optional: true,
      type: "object",
    });
  });
});
