import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";
import { EnrichedModel } from "../routes/types";

const typeSchema = types.obj({
  id: types.string().key().readOnly().public(),
  val: types.int().public(),
});

export class StrangeIdModels_ extends BaseModel<typeof typeSchema> {}
useModel(StrangeIdModels_, { typeSchema, collection: "strangeids" });
export const StrangeIdModels = StrangeIdModels_ as unknown as EnrichedModel<
  typeof typeSchema
>;
