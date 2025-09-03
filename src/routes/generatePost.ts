import {
  createParams,
  createBody,
  reverseMap,
  createIdParam,
  makeSchema,
  validateModelIsCreatable,
  getPathParamKeys,
  MappingError,
  getInjectedParamValues,
  nameFromPrefix,
} from "./common";
import { HttpError, prepare, httpErrorSchema } from "@apparts/prep";
import { NotUnique } from "@apparts/model";
import { GeneratorFnParams } from "./types";
import { GenericQueriable } from "@apparts/db";

export const generatePost = <AccessType>(
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
    trackChanges,
    idField,
    extraPathFields,
  } = parameters;

  if (!authF) {
    throw new Error(`Route (post) ${prefix} has no access control function.`);
  }

  const injectedParamKeys = Object.keys(injectParameters);

  const types = Model.getSchema().getModelType();
  const pathParamKeys = getPathParamKeys(
    prefix,
    Model.getSchema(),
    extraPathFields
  );
  validateModelIsCreatable([...pathParamKeys, String(idField)], types);

  const schema = Model.getSchema();
  const params = createParams(prefix, schema, extraPathFields);
  const postF = prepare(
    {
      title: title || "Create " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema(params),
        body: makeSchema(createBody(params, Model, injectedParamKeys)),
      },
      returns: [
        makeSchema(createIdParam(Model, String(idField))),
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
        body = reverseMap(body, types, injectedParamKeys);
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

      const injectedParamValues = await getInjectedParamValues(
        injectParameters,
        req
      );

      const model = new Model(dbs, [
        { ...body, ...params, ...injectedParamValues },
      ]);
      try {
        await model.store();
      } catch (e) {
        if (e instanceof NotUnique) {
          return new HttpError(412, "Could not create item because it exists");
        }
        throw e;
      }

      if (trackChanges) {
        await trackChanges(me, null, model.content);
      }
      return model.content[String(idField)];
    }
  );
  return postF;
};
