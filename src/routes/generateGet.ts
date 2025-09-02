import { prepare } from "@apparts/prep";
import {
  createParams,
  createReturns,
  makeSchema,
  nameFromPrefix,
  unmapKey,
} from "./common";

import { GenericQueriable } from "@apparts/db";
import { createFilter } from "./get/createFilter";
import { createOrder } from "./get/createOrder";
import { Filter, processFilter } from "./get/processFilter";
import { GeneratorFnParams } from "./types";

export const generateGet = <AccessType>(
  params: GeneratorFnParams<AccessType, any>
) => {
  const {
    prefix,
    Model,
    routeConfig: { hasAccess: authF, title, description },
  } = params;
  if (!authF) {
    throw new Error(`Route (get) ${prefix} has no access control function.`);
  }
  const schema = Model.getSchema();
  const getF = prepare(
    {
      title: title || "Get " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        query: makeSchema({
          limit: { type: "int", default: 50 },
          offset: { type: "int", default: 0 },
          order: createOrder(Model),
          filter: createFilter(prefix, schema),
        }),
        params: makeSchema(createParams(prefix, schema)),
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
      let { order } = req.query as {
        order: {
          key: string;
          dir: "ASC" | "DESC";
        }[];
      };

      const dbFilter = processFilter(Model, filter);

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
      await res.load({ ...dbFilter, ...params }, limit, offset, order);
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
