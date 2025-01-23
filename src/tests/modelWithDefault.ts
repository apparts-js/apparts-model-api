import { BaseModel, useModel } from "@apparts/model";
import * as types from "@apparts/types";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  optionalVal: types.string().optional().public(),
  hasDefault: types.int().default(7).public(),
  hasReadOnlyWithDefault: types.int().readOnly().public().default(8),
  mapped: types.int().mapped("someNumber").public(),
});

export class ModelsWithDefault extends BaseModel<typeof typeSchema> {}
useModel(ModelsWithDefault, { typeSchema, collection: "modelWithDefault" });
