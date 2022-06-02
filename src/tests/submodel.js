const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  modelId: {
    type: "id",
    public: true,
  },
  opt: {
    type: "string",
    public: true,
    optional: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "submodel");

module.exports = makeModel("SubModel", [Models, Model, NoModel]);
