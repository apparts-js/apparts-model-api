import * as types from "@apparts/types";
import { useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  optionalVal: types.string().optional().public(),
  hasDefault: types.int().default(7),
  mapped: types.int().mapped("someNumber").public(),
  isDerived: types
    .int()
    .semantic("id")
    .public()
    .derived(({ id }) => id),
});

export const Models = useModel({
  collection: "model",
  typeSchema,
});
