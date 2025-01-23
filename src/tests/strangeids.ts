import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.string().key().readOnly().public(),
  val: types.int().public(),
});

export class StrangeIdModels extends BaseModel<typeof typeSchema> {}
useModel(StrangeIdModels, { typeSchema, collection: "strangeids" });
