import * as types from "@apparts/types";
import { BaseModel, useModel, ConstructorParams } from "@apparts/model";
import { EnrichedModel } from "../routes/types";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  optionalVal: types.string().optional().public(),
  hasDefault: types.int().default(7),
  mapped: types.int().mapped("someNumber").public(),
  isDerived: types.int().semantic("id").public().derived(),
});

export class Models_ extends BaseModel<typeof typeSchema> {
  constructor(...args: ConstructorParams<typeof typeSchema>) {
    super(...args);
    this.derived({
      isDerived: ({ id }) => id,
    });
  }
}

useModel(Models_, { typeSchema, collection: "model" });
export const Models = Models_ as unknown as EnrichedModel<typeof typeSchema>;
