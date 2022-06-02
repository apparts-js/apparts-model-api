const { useModel, makeModel } = require("@apparts/model");

const types = {
  id: {
    type: "string",
    public: true,
    key: true,
    readOnly: true,
  },
  val: {
    type: "int",
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "strangeids");

module.exports = makeModel("StangeIdModel", [Models, Model, NoModel]);
