import * as types from "@apparts/types";
import { BaseModel, useModel } from "@apparts/model";
import { EnrichedModel } from "../routes/types";

const typeSchema = types.obj({
  id: types.int().semantic("id").key().auto().public(),
  textarray: types.array(types.string()).public(),
  object: types
    .obj({
      a: types.int(),
      bcd: types.string(),
      nestedObj: types
        .obj({
          inner: types.string(),
        })
        .optional(),
      nestedArray: types.array(types.string()).optional(),
      nestedObjValues: types.objValues(types.string()).optional(),
      nestedOneOf: types.oneOf([types.string(), types.int()]).optional(),
      nestedOneOfWithObj: types
        .oneOf([
          types.string(),
          types.obj({
            a: types.string().optional(),
          }),
          types.obj({
            a: types.value("a"),
          }),
        ])
        .optional(),
      nestedOneOfValues: types
        .oneOf([types.value(1), types.value(2)])
        .optional(),
      value: types.value(2).optional(),
      innerWithDef: types.string().default("the default"),
      deepInner: types
        .array(
          types.oneOf([
            types.obj({
              a: types.string().default("deep default"),
            }),
          ])
        )
        .optional(),
    })
    .public(),
});

export class AdvancedModels_ extends BaseModel<typeof typeSchema> {}
useModel(AdvancedModels_, { typeSchema, collection: "advancedmodel" });
export const AdvancedModels = AdvancedModels_ as unknown as EnrichedModel<
  typeof AdvancedModels_
>;
