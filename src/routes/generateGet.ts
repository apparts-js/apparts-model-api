import { prepare } from "@apparts/prep";
import {
  createParams,
  createReturns,
  getInjectedParamValues,
  makeSchema,
  nameFromPrefix,
  prepareParams,
  unmapKey,
} from "./common";

import { GenericQueriable } from "@apparts/db";
import { createFilter } from "./get/createFilter";
import { createOrder } from "./get/createOrder";
import { Filter, processFilter } from "./get/processFilter";
import { GeneratorFnParams } from "./types";

export const generateGet = <AccessType>(
  parameters: GeneratorFnParams<AccessType, any>
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
    extraPathFields,
    prepOptions,
  } = parameters;
  if (!authF) {
    throw new Error(`Route (get) ${prefix} has no access control function.`);
  }

  const injectedParamKeys = Object.keys(injectParameters);
  const extraPathFieldKeys = Object.keys(extraPathFields.getModelType());

  const schema = Model.getSchema();
  const params = createParams(prefix, schema, extraPathFields);
  const getF = prepare(
    {
      ...prepOptions,
      title: title || "Get " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        query: makeSchema({
          limit: { type: "int", default: 50 },
          offset: { type: "int", default: 0 },
          order: createOrder(Model),
          filter: createFilter(params, schema, injectedParamKeys),
        }),
        params: makeSchema(params),
      },
      returns: [
        makeSchema({
          type: "object",
          keys: {
            data: {
              type: "array",
              items: {
                type: "object",
                keys: createReturns(Model),
              },
            },
            total: { type: "int" },
          },
        }),
      ],
    },
    async (req) => {
      const {
        dbs,
        query: { limit, offset, filter },
        params,
      } = req as typeof req & {
        dbs: GenericQueriable;
        query: { limit?: number; offset?: number; filter: Filter };
      };
      const fullParams = prepareParams(
        params,
        await getInjectedParamValues(injectParameters, req),
        extraPathFieldKeys
      );
      let { order } = req.query as {
        order: {
          key: string;
          dir: "ASC" | "DESC";
        }[];
      };

      const dbFilter = processFilter(Model, filter, injectedParamKeys);

      if (order) {
        const types = Model.getSchema().getModelType();
        order = order.map(({ dir, key }) => {
          const [first, ...path] = key.split(".");
          return {
            dir,
            path: path.length >= 1 ? path : undefined,
            key: unmapKey(first, types),
          };
        });
      }
      const res = new Model(dbs);
      await res.load(
        {
          ...dbFilter,
          ...fullParams,
        },
        limit,
        offset,
        order
      );
      let total = res.contents.length;
      if (offset || total === limit) {
        total = await res.count({ ...dbFilter, ...params });
      }
      return {
        data: await res.getPublic(),
        total,
      };
    }
  );
  return getF;
};
