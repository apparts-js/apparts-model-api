import { createFilter } from "./createFilter";
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
      type: "array",
      items: { type: "int" },
    },
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
      type: "array",
      items: {
        type: "int",
        semantic: "id",
      },
    },

    {
      type: "int",
      semantic: "id",
    },
  ];
  const stringAlternatives = [
    {
      type: "array",
      items: { type: "string" },
    },

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
          ...stringAlternatives.slice(1),
          ...numberAlternatives.slice(1),
          {
            type: "array",
            items: {
              type: "oneOf",
              alternatives: [{ type: "string" }, { type: "int" }],
            },
          },
        ]),
        "object.nestedOneOfWithObj": filterAlts([
          ...optionalAlternatives,
          ...stringAlternatives.slice(1),
          {
            type: "array",
            items: {
              type: "oneOf",
              alternatives: [{ type: "string" }],
            },
          },
        ]),
        "object.nestedOneOfWithObj.a": filterAlts([
          ...optionalAlternatives,
          ...stringAlternatives,
        ]),
        "object.nestedOneOfValues": filterAlts([
          ...optionalAlternatives,
          { value: 1 },
          { value: 2 },
          {
            type: "array",
            items: {
              type: "oneOf",
              alternatives: [{ value: 1 }, { value: 2 }],
            },
          },
        ]),
        "object.value": filterAlts([...optionalAlternatives, { value: 2 }]),
        "object.innerWithDef": filterAlts(stringAlternatives),
        "object.deepInner": filterAlts(optionalAlternatives),
      },
      optional: true,
      type: "object",
    });
  });
});
