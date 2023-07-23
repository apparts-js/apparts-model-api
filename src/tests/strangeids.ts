import * as types from "@apparts/types";
import { useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.string().key().readOnly().public(),
  val: types.int().public(),
});

export const StrangeIdModels = useModel({
  collection: "strangeids",
  typeSchema,
});
