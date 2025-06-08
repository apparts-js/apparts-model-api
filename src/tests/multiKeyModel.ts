import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";
import { EnrichedModel } from "../routes/types";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().public(),
  key: types.string().key().public(),
});

export class MultiModels_ extends BaseModel<typeof typeSchema> {}
useModel(MultiModels_, { typeSchema, collection: "multikey" });
export const MultiModels = MultiModels_ as unknown as EnrichedModel<
  typeof MultiModels_
>;
