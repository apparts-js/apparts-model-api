import * as types from "@apparts/types";
import { useModel } from "@apparts/model";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().public(),
  key: types.string().key().public(),
});

export const MultiModels = useModel({ typeSchema, collection: "multikey" });
