import * as types from "@apparts/types";
import { useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  modelId: types.int().semantic("id").public(),
  opt: types.string().public().optional(),
});

export const SubModels = useModel({ typeSchema, collection: "submodel" });
