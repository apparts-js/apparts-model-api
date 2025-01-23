import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";

const typeSchema = types.obj({
  specialId: types.int().semantic("id").key().auto().public(),
  val: types.int().public(),
});

export class NamedIdModels extends BaseModel<typeof typeSchema> {}
useModel(NamedIdModels, { typeSchema, collection: "namedidmodel" });
