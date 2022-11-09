const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  textarray: {
    type: "array",
    items: { type: "string" },
    public: true,
  },
  object: {
    type: "object",
    keys: {
      a: { type: "int" },
      bcd: { type: "string" },
      nestedObj: {
        optional: true,
        type: "object",
        keys: {
          inner: { type: "string" },
        },
      },
      nestedArray: {
        optional: true,
        type: "array",
        items: { type: "string" },
      },
      nestedObjValues: {
        optional: true,
        type: "object",
        values: { type: "string" },
      },
      nestedOneOf: {
        optional: true,
        type: "oneOf",
        alternatives: [{ type: "string" }, { type: "int" }],
      },
      nestedOneOfWithObj: {
        optional: true,
        type: "oneOf",
        alternatives: [{ type: "string" }, { type: "object", keys: {} }],
      },
      nestedOneOfValues: {
        optional: true,
        type: "oneOf",
        alternatives: [{ value: 1 }, { value: 2 }],
      },
      value: {
        optional: true,
        value: 2,
      },
      innerWithDef: { type: "string", default: "the default" },
      deepInner: {
        type: "array",
        optional: true,
        items: {
          type: "oneOf",
          alternatives: [
            {
              type: "object",
              keys: {
                a: {
                  type: "string",
                  default: "deep default",
                },
              },
            },
          ],
        },
      },
    },
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "advancedmodel");

module.exports = makeModel("AdvancedModel", [Models, Model, NoModel]);
