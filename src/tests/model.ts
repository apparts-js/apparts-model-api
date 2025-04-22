import * as types from "@apparts/types";
import { BaseModel, useModel, ConstructorParams } from "@apparts/model";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  optionalVal: types.string().optional().public(),
  hasDefault: types.int().default(7),
  mapped: types.int().mapped("someNumber").public(),
  isDerived: types.int().semantic("id").public().derived(),
});

export class Models extends BaseModel<typeof typeSchema> {
  constructor(...args: ConstructorParams<typeof typeSchema>) {
    super(...args);
    this.derived({
      isDerived: ({ id }) => id,
    });
  }
}

useModel(Models, { typeSchema, collection: "model" });
