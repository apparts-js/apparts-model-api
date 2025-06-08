import * as types from "@apparts/types";
import { collectTypes, createFilter } from "./createFilter";

const filterAlts = (alts) => ({
  alternatives: alts,
  optional: true,
  type: "oneOf",
});

describe("collectTypes", () => {
  it("should return correct list", async () => {
    expect(
      collectTypes(
        types
          .obj({
            a: types.int(),
            mapped: types.int().mapped("b"),
            obj: types.obj({
              b: types.string(),
              c: types.oneOf([types.int(), types.string()]),
            }),
            oneOf: types.oneOf([
              types.obj({
                a: types.value("a"),
              }),
              types.obj({
                a: types.value("b"),
              }),
            ]),
          })
          .getModelType()
      )
    ).toStrictEqual({
      a: [types.int()].map((t) => t.getType()),
      b: [types.int().mapped("b")].map((t) => t.getType()),
      "obj.b": [types.string()].map((t) => t.getType()),
      "obj.c": [types.int(), types.string()].map((t) => t.getType()),
      "oneOf.a": [types.value("a"), types.value("b")].map((t) => t.getType()),
    });
  });
});

describe("filter api type", () => {
  const numberAlternatives = [
    types.float(),
    types.array(types.float()),
    types.obj({
      gt: types.int().optional(),
      gte: types.int().optional(),
      lt: types.int().optional(),
      lte: types.int().optional(),
    }),
  ].map((t) => t.getType());
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
    types.string(),
    types.array(types.string()),
    types.obj({
      like: types.string().optional(),
      ilike: types.string().optional(),
    }),
  ].map((t) => t.getType());
  const optionalAlternatives = [
    types.obj({
      exists: types.boolean(),
    }),
  ].map((t) => t.getType());

  it("should not include derived types", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          isDerived: types.int().public().derived(),
        })
      )
    ).toStrictEqual({
      keys: {},
      optional: true,
      type: "object",
    });
  });

  it("should not include non-public types", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          a: types.int(),
        })
      )
    ).toStrictEqual({
      keys: {},
      optional: true,
      type: "object",
    });
  });

  it("should produce mapped filter", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          b: types.string().mapped("mapped").public(),
        })
      )
    ).toStrictEqual({
      keys: {
        mapped: filterAlts(stringAlternatives),
      },
      optional: true,
      type: "object",
    });
  });

  it("should produce optional filter", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          c: types.string().optional().public(),
        })
      )
    ).toStrictEqual({
      keys: {
        c: filterAlts([...optionalAlternatives, ...stringAlternatives]),
      },
      optional: true,
      type: "object",
    });
  });

  it("should produce string filter", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          a: types.string().public(),
        })
      )
    ).toStrictEqual({
      keys: {
        a: filterAlts(stringAlternatives),
      },
      optional: true,
      type: "object",
    });
  });

  it("should produce number filter", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          a: types.int().public(),
          b: types.float().public(),
        })
      )
    ).toStrictEqual({
      keys: {
        a: filterAlts(numberAlternatives),
        b: filterAlts(numberAlternatives),
      },
      optional: true,
      type: "object",
    });
  });
  it("should produce boolean filter", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          a: types.boolean().public(),
        })
      )
    ).toStrictEqual({
      keys: {
        a: filterAlts([types.boolean().getType()]),
      },
      optional: true,
      type: "object",
    });
  });
  it("should not produce filter for single value", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          a: types.value("a").public(),
        })
      )
    ).toStrictEqual({
      keys: {},
      optional: true,
      type: "object",
    });
  });

  it("should produce nested obj filter", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          obj: types
            .obj({
              a: types.int(),
              b: types.obj({
                c: types.string(),
              }),
              c: types.string().optional(),
            })
            .public(),
        })
      )
    ).toStrictEqual({
      keys: {
        "obj.a": filterAlts(numberAlternatives),
        "obj.b.c": filterAlts(stringAlternatives),
        "obj.c": filterAlts([...optionalAlternatives, ...stringAlternatives]),
      },
      optional: true,
      type: "object",
    });
  });

  it("should produce oneOf filter with objects with values", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          oneOf: types
            .oneOf([
              types.obj({
                a: types.value("a"),
              }),
              types.obj({
                a: types.value("b"),
              }),
              types.obj({
                a: types.string(),
              }),
            ])
            .public(),
        })
      )
    ).toStrictEqual({
      keys: {
        "oneOf.a": filterAlts([
          ...stringAlternatives,
          types
            .array(types.oneOf([types.value("a"), types.value("b")]))
            .getType(),
        ]),
      },
      optional: true,
      type: "object",
    });
  });

  it("should produce oneOf filter with lists for each type", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          oneOf: types
            .oneOf([types.string(), types.int(), types.uuid()])
            .public(),
        })
      )
    ).toStrictEqual({
      keys: {
        oneOf: filterAlts([...stringAlternatives, ...numberAlternatives]),
      },
      optional: true,
      type: "object",
    });
  });

  it("should not produce filter for array", async () => {
    expect(
      createFilter(
        "",
        types.obj({
          array: types.array(types.string()).public(),
        })
      )
    ).toStrictEqual({
      keys: {},
      optional: true,
      type: "object",
    });
  });
});
