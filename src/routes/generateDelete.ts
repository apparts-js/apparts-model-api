import { value } from "@apparts/types";
import {
  createParams,
  createIdParam,
  makeSchema,
  getInjectedParamValues,
  nameFromPrefix,
  prepareParams,
  makeObjSchema,
} from "./common";
import { IsReference } from "@apparts/model";
import { prepare, HttpError, httpErrorSchema } from "@apparts/prep";
import { GenericQueriable } from "@apparts/db";
import { GeneratorFnParams } from "./types";

export const generateDelete = <AccessType>(
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
    trackChanges,
    idField,
    extraPathFields,
    prepOptions,
  } = params;

  if (!authF) {
    throw new Error(`Route (delete) ${prefix} has no access control function.`);
  }

  const extraPathFieldKeys = Object.keys(extraPathFields.getModelType());

  const schema = Model.getSchema();
  const deleteF = prepare(
    {
      ...prepOptions,
      title: title || "Delete " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        params: makeObjSchema({
          ...createParams(prefix, schema, extraPathFields),
          [String(idField) + "s"]: {
            type: "array",
            items: createIdParam(Model, idField),
          },
        }),
      },
      returns: [
        value("ok"),
        httpErrorSchema(
          412,
          "Could not delete as other items reference this item"
        ),
      ],
    },
    async (req, _, me) => {
      const {
        dbs,
        params: { [String(idField) + "s"]: ids, ...restParams },
      } = req as typeof req & {
        dbs: GenericQueriable;
        params: Record<string, string[]>;
      };

      if (ids.length === 0) {
        return "ok";
      }

      const fullParams = prepareParams(
        restParams,
        await getInjectedParamValues(injectParameters, req),
        extraPathFieldKeys
      );

      const res = new Model(dbs);
      await res.load({
        [idField]: { op: "in", val: ids },
        ...fullParams,
      });
      try {
        await res.deleteAll();
      } catch (e) {
        if (e instanceof IsReference) {
          return new HttpError(
            412,
            "Could not delete as other items reference this item"
          );
        }
        throw e;
      }
      if (trackChanges) {
        await trackChanges(me, res.contents, null);
      }
      return "ok";
    }
  );
  return deleteF;
};
