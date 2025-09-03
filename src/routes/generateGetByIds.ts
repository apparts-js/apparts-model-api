import {
  createParams,
  createReturns,
  createIdParam,
  makeSchema,
  getInjectedParamValues,
  nameFromPrefix,
} from "./common";

import { prepare } from "@apparts/prep";
import { GeneratorFnParams } from "./types";
import { GenericQueriable } from "@apparts/db";

export const generateGetByIds = <AccessType>(
  params: GeneratorFnParams<AccessType, any>
) => {
  const {
    prefix,
    Model,
    routeConfig: {
      hasAccess: authF,
      title,
      description,
      injectParameters = {},
    },
    idField,
    extraPathFields,
  } = params;

  if (!authF) {
    throw new Error(
      `Route (getByIds) ${prefix} has no access control function.`
    );
  }
  const schema = Model.getSchema();
  const getF = prepare(
    {
      title: title || "Get " + nameFromPrefix(prefix) + " by Ids",
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...createParams(prefix, schema, extraPathFields),
          [String(idField) + "s"]: {
            type: "array",
            items: createIdParam(Model, String(idField)),
          },
        }),
      },
      returns: [
        makeSchema({
          type: "array",
          items: {
            type: "object",
            keys: createReturns(Model),
          },
        }),
      ],
    },
    async (req) => {
      const {
        dbs,
        params: { [String(idField) + "s"]: ids, ...restParams },
      } = req as typeof req & {
        dbs: GenericQueriable;
        params: Record<string, string[]>;
      };

      if (ids.length === 0) {
        return [];
      }

      const injectedParamValues = await getInjectedParamValues(
        injectParameters,
        req
      );

      const res = new Model(dbs);
      await res.load({
        [String(idField)]: { op: "in", val: ids },
        ...restParams,
        ...injectedParamValues,
      });
      return await res.getPublic();
    }
  );
  return getF;
};
