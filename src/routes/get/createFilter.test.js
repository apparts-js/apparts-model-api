const { createFilter } = require("./createFilter");
const { useModel } = require("../../tests/model.js");
const { useAdvancedModel } = require("../../tests/advancedmodel.js");

const filterAlts = (alts) => ({
  alternatives: alts,
  optional: true,
  type: "oneOf",
});

describe("filter api type", () => {
  const numberAlternatives = [
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
  ];
  const idAlternatives = [
    {
      type: "id",
    },
  ];
  const stringAlternatives = [
    {
      type: "string",
    },
    {
      keys: {
        like: {
          type: "string",
          optional: true,
        },
        ilike: {
          type: "string",
          optional: true,
        },
      },
      type: "object",
    },
  ];
  const optionalAlternatives = [
    {
      type: "object",
      keys: {
        exists: { type: "boolean" },
      },
    },
  ];
  test("Should not include derived types", async () => {
    expect(createFilter("", useModel)).toStrictEqual({
      keys: {
        id: filterAlts(idAlternatives),
        optionalVal: filterAlts([
          ...optionalAlternatives,
          ...stringAlternatives,
        ]),
        someNumber: filterAlts(numberAlternatives),
      },
      optional: true,
      type: "object",
    });
  });
  test("Should not include arrays, correctly show objects", async () => {
    const a = {
      keys: {
        id: filterAlts(idAlternatives),
        "object.a": filterAlts(numberAlternatives),
        "object.bcd": filterAlts(stringAlternatives),
        "object.nestedObj": filterAlts(optionalAlternatives),
        "object.nestedObj.inner": filterAlts(stringAlternatives),
        "object.nestedArray": filterAlts(optionalAlternatives),
        "object.nestedObjValues": filterAlts(optionalAlternatives),
        "object.nestedOneOf": filterAlts([
          ...optionalAlternatives,
          {
            type: "string",
          },
          {
            type: "int",
          },
        ]),
        "object.nestedOneOfWithObj": filterAlts(optionalAlternatives),
        "object.nestedOneOfValues": filterAlts([
          ...optionalAlternatives,
          { value: 1 },
          { value: 2 },
        ]),
        "object.value": filterAlts(optionalAlternatives),
        "object.readOnlyString": filterAlts(stringAlternatives),
        "object.innerWithDef": filterAlts(stringAlternatives),
        "object.deepInner": filterAlts(optionalAlternatives),
      },
      optional: true,
      type: "object",
    };
    console.log(JSON.stringify(a, null, 2));
    console.log(JSON.stringify(createFilter("", useAdvancedModel), null, 2));
    expect(createFilter("", useAdvancedModel)).toStrictEqual(a);
  });
});
