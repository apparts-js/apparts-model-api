const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  optionalVal: {
    type: "string",
    optional: true,
    public: true,
  },
  hasDefault: {
    type: "int",
    default: 7,
  },
  mapped: {
    type: "int",
    mapped: "someNumber",
    public: true,
  },
  isDerived: {
    public: true,
    type: "id",
    derived: ({ id }) => id,
  },
};

const [Models, Model, NoModel] = useModel(types, "model");

module.exports = makeModel("Model", [Models, Model, NoModel]);
