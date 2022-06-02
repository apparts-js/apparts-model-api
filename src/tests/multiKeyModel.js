const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "id",
    public: true,
    key: true,
  },
  key: {
    type: "string",
    key: true,
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "multikey");

module.exports = makeModel("MultiModel", [Models, Model, NoModel]);
