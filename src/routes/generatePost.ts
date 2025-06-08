import {
  createParams,
  createBody,
  nameFromPrefix,
  reverseMap,
  createIdParam,
  makeSchema,
  validateModelIsCreatable,
  getPathParamKeys,
  MappingError,
} from "./common";
import { HttpError, prepare, httpErrorSchema } from "@apparts/prep";
import { NotUnique } from "@apparts/model";
import { GeneratorFnParams } from "./types";
import { GenericQueriable } from "@apparts/db";

export const generatePost = <AccessType>(
  params: GeneratorFnParams<AccessType>
) => {
  const {
    prefix,
    Model,
    routeConfig: { hasAccess: authF, title, description },
    trackChanges,
    idField,
  } = params;

  if (!authF) {
    throw new Error(`Route (post) ${prefix} has no access control function.`);
  }

  const types = Model.getSchema().getModelType();
  const pathParamKeys = getPathParamKeys(prefix, types);
  validateModelIsCreatable([...pathParamKeys, idField], types);

  const schema = Model.getSchema();
  const postF = prepare(
    {
      title: title || "Create " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...createParams(prefix, schema),
        }),
        body: makeSchema({
          ...createBody(prefix, Model),
        }),
      },
      returns: [
        makeSchema({
          ...createIdParam(Model, idField),
        }),
        httpErrorSchema(
          400,
          "Could not create item because your request had too many parameters"
        ),
        httpErrorSchema(412, "Could not create item because it exists"),
      ],
    },
    async (req, _res, me) => {
      const { dbs, params } = req as typeof req & {
        dbs: GenericQueriable;
      };
      let { body } = req;

      try {
        body = reverseMap(body, types);
      } catch (e) {
        if (e instanceof MappingError) {
          return new HttpError(
            400,
            "Could not create item because your request had too many parameters",
            e.message
          );
        }
        throw e;
      }

      for (const key of Object.keys(body)) {
        if (!types[key] || !types[key].public || types[key].auto) {
          return new HttpError(
            400,
            "Could not create item because your request had too many parameters",
            `"${key}" does not exist`
          );
        }
      }

      const model = new Model(dbs, [{ ...body, ...params }]);
      try {
        await model.store();
      } catch (e) {
        if (e instanceof NotUnique) {
          return new HttpError(412, "Could not create item because it exists");
        }
        throw e;
      }

      trackChanges && (await trackChanges(me, null, model.content));
      return model.content[idField];
    }
  );
  return postF;
};
