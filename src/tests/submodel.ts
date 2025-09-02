import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";
import { EnrichedModel } from "../routes/types";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  modelId: types.int().semantic("id").public(),
  opt: types.string().public().optional(),
});

class SubModels_ extends BaseModel<typeof typeSchema> {}
useModel(SubModels_, { typeSchema, collection: "submodel" });
export const SubModels = SubModels_ as unknown as EnrichedModel<
  typeof typeSchema
>;
