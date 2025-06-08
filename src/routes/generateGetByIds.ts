import {
  createParams,
  nameFromPrefix,
  createReturns,
  createIdParam,
  makeSchema,
} from "./common";
import { prepare } from "@apparts/prep";
import { GeneratorFnParams } from "./types";
import { GenericQueriable } from "@apparts/db";

export const generateGetByIds = <AccessType>(
  params: GeneratorFnParams<AccessType>
) => {
  const {
    prefix,
    Model,
    routeConfig: { hasAccess: authF, title, description },
    idField,
  } = params;

  if (!authF) {
    throw new Error(
      `Route (getByIds) ${prefix} has no access control function.`
    );
  }
  const getF = prepare(
    {
      title: title || "Get " + nameFromPrefix(prefix) + " by Ids",
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...createParams(prefix, Model),
          [idField + "s"]: {
            type: "array",
            items: createIdParam(Model, idField),
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
        params: { [idField + "s"]: ids, ...restParams },
      } = req as typeof req & {
        dbs: GenericQueriable;
        params: Record<string, string[]>;
      };

      if (ids.length === 0) {
        return [];
      }

      const res = new Model(dbs);
      await res.load({ [idField]: { op: "in", val: ids }, ...restParams });
      return await res.getPublic();
    }
  );
  return getF;
};
