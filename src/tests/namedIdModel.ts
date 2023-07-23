import * as types from "@apparts/types";
import { useModel } from "@apparts/model";

const typeSchema = types.obj({
  specialId: types.int().semantic("id").key().auto().public(),
  val: types.int().public(),
});

export const NamedIdModels = useModel({
  collection: "namedidmodel",
  typeSchema,
});
