const { useModel, makeModel } = require("@apparts/model");

const types = {
  specialId: {
    type: "id",
    public: true,
    auto: true,
    key: true,
  },
  val: {
    type: "int",
    public: true,
  },
};

const [Models, Model, NoModel] = useModel(types, "namedidmodel");

module.exports = makeModel("NamedIdModel", [Models, Model, NoModel]);
