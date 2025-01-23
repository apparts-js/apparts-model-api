import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().public(),
  key: types.string().key().public(),
});

export class MultiModels extends BaseModel<typeof typeSchema> {}
useModel(MultiModels, { typeSchema, collection: "multikey" });
