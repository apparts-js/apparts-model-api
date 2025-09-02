import * as types from "@apparts/types";
import { Params as DbParams, Filter as DbFilter } from "@apparts/db";
import { reverseMap, unmapKey } from "../common";
import { EnrichedModel, Model } from "../types";
export type Filter = {
  [key: string]:
    | string
    | number
    | boolean
    | {
        exists?: boolean;
        gt?: number;
        gte?: number;
        lt?: number;
        lte?: number;
        like?: string;
        ilike?: string;
      };
};

export const typeIsKnownForDottedPath = (path: string[], type: types.Type) => {
  if ("value" in type) {
    return false;
  }
  if (type.type === "oneOf") {
    return false;
  }
  if (type.type === "array") {
    return typeIsKnownForDottedPath(path, type.items);
  }
  if ("values" in type) {
    return typeIsKnownForDottedPath(path, type.values);
  }
  if (path.length === 0) {
    return true;
  }
  const [first, ...rest] = path;
  if (!("keys" in type) || !type.keys[first]) {
    throw new Error(
      `Type ${
        type.type
      } does not have keys, cannot process dotted path ${path.join(".")}`
    );
  }

  return typeIsKnownForDottedPath(rest, type.keys[first]);
};

const operatorToJSType = (op: string) => {
  switch (op) {
    case "exists":
    case "in":
      return null;
    case "like":
    case "ilike":
      return "string";
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return "number";
    default:
      throw new Error(`Unknown operator ${op}`);
  }
};

const pathFilter = (
  path: string[],
  type: "string" | "number" | "boolean" | null,
  filter: DbFilter | string | number | boolean
): DbFilter => {
  return {
    op: "of",
    val: {
      path,
      cast: type,
      value: filter,
    },
  };
};

const and = (...filters: DbFilter[]) => {
  if (filters.length === 1) {
    return filters[0];
  }
  return {
    op: "and" as const,
    val: filters,
  };
};

const ofType = (type: "string" | "number" | "boolean", path: string[]) => ({
  op: "oftype" as const,
  val: {
    path,
    value: type,
  },
});

const pathFilterChecked = <T extends DbFilter | string | number | boolean>(
  paramType: "string" | "number" | "boolean" | null,
  filter: T,
  path: string[],
  typeIsKnown: boolean
) => {
  if (path.length === 0) {
    return filter;
  }
  const pathedFilter = pathFilter(path, paramType, filter);
  if (!typeIsKnown && paramType !== null) {
    return and(ofType(paramType, path), pathedFilter);
  }
  return pathedFilter;
};

export const processFilter = (
  Model: EnrichedModel<any>,
  filters: Filter = {}
): DbParams => {
  const dbFilters: Record<string, DbFilter | number | string | boolean> = {};

  for (const key in filters) {
    const filter = filters[key];
    if (filter === null) {
      continue;
    }

    const [first, ...path] = key.split(".");
    const typeIsKnown = typeIsKnownForDottedPath(
      [unmapKey(first, Model.getSchema().getModelType()), ...path],
      Model.getSchema().getType()
    );
    if (Array.isArray(filter)) {
      // All types in the array must be same as per endpoint definition.
      const paramType = typeof filter[0] as "string" | "number" | "boolean";

      dbFilters[first] = pathFilterChecked(
        paramType,
        {
          op: "in",
          val: filter,
        },
        path,
        typeIsKnown
      );
      continue;
    } else if (typeof filter !== "object") {
      const paramType = typeof filter as "string" | "number" | "boolean";
      dbFilters[first] = pathFilterChecked(
        paramType,
        filter,
        path,
        typeIsKnown
      );
      continue;
    } else {
      const operants = Object.keys(filter).map(
        (op) =>
          ({
            op,
            val: filter[op],
          } as DbFilter)
      );
      if (operants.length === 0) {
        continue;
      }
      dbFilters[first] = and(
        ...operants.map((operant) =>
          pathFilterChecked(
            operatorToJSType(operant.op),
            operant,
            path,
            typeIsKnown
          )
        )
      );
    }
  }
  return reverseMap(dbFilters, Model.getSchema().getModelType());
};
