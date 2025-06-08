import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";
import { EnrichedModel } from "../routes/types";

const typeSchema = types.obj({
  specialId: types.int().semantic("id").key().auto().public(),
  val: types.int().public(),
});

export class NamedIdModels_ extends BaseModel<typeof typeSchema> {}
useModel(NamedIdModels_, { typeSchema, collection: "namedidmodel" });
export const NamedIdModels = NamedIdModels_ as unknown as EnrichedModel<
  typeof NamedIdModels_
>;
