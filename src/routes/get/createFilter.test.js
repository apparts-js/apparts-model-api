const { createFilter } = require("./createFilter");
import { Models } from "../../tests/model";
import { AdvancedModels } from "../../tests/advancedmodel";

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
      type: "int",
      semantic: "id",
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
    expect(createFilter("", Models)).toStrictEqual({
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
    expect(createFilter("", AdvancedModels)).toStrictEqual({
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
        "object.innerWithDef": filterAlts(stringAlternatives),
        "object.deepInner": filterAlts(optionalAlternatives),
      },
      optional: true,
      type: "object",
    });
  });
});
