import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  modelId: types.int().semantic("id").public(),
  opt: types.string().public().optional(),
});

export class SubModels extends BaseModel<typeof typeSchema> {}
useModel(SubModels, { typeSchema, collection: "submodel" });
