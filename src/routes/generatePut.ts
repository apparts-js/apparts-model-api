import {
  createParams,
  reverseMap,
  createBody,
  createIdParam,
  makeSchema,
  getPathParamKeys,
  validateModelIsCreatable,
  MappingError,
  getInjectedParamValues,
  nameFromPrefix,
  prepareParams,
} from "./common";
import {
  HttpError,
  HttpCode,
  httpCodeSchema,
  prepare,
  httpErrorSchema,
} from "@apparts/prep";
import { NotFound } from "@apparts/model";
import { GeneratorFnParams } from "./types";
import { GenericQueriable } from "@apparts/db";

export const generatePut = <AccessType>(
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
    throw new Error(`Route (put) ${prefix} has no access control function.`);
  }

  const injectedParamKeys = Object.keys(injectParameters);
  const extraPathFieldKeys = Object.keys(extraPathFields.getModelType());

  const types = Model.getSchema().getModelType();
  const pathParamKeys = getPathParamKeys(
    prefix,
    Model.getSchema(),
    extraPathFields
  );
  const canCreate =
    !types[String(idField)].auto &&
    pathParamKeys.filter((key) => types[key].auto).length === 0 &&
    Object.keys(types).filter(
      (key) =>
        key !== String(idField) &&
        types[key].key &&
        !types[key].auto &&
        !types[key].public
    ).length === 0;
  validateModelIsCreatable([...pathParamKeys, String(idField)], types);

  const schema = Model.getSchema();
  const params = createParams(prefix, schema, extraPathFields);
  const putF = prepare(
    {
      title: title || "Alter " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...params,
          [String(idField)]: createIdParam(Model, String(idField)),
        }),
        body: makeSchema(createBody(params, Model, injectedParamKeys)),
      },
      returns: [
        makeSchema(createIdParam(Model, String(idField))),
        canCreate
          ? httpCodeSchema(
              201,
              makeSchema({
                ...createIdParam(Model, String(idField)),
              })
            )
          : httpErrorSchema(404, nameFromPrefix(prefix) + " not found"),
        httpErrorSchema(
          400,
          "Could not alter item because your request had too many parameters"
        ),
        httpErrorSchema(
          400,
          "Could not alter item because it would change a path id"
        ),
      ],
    },
    async (req, _res, me) => {
      const { dbs, params } = req as typeof req & {
        dbs: GenericQueriable;
      };
      let { body } = req;

      const fullParams = prepareParams(
        params,
        await getInjectedParamValues(injectParameters, req),
        extraPathFieldKeys
      );

      try {
        body = reverseMap(body, types, injectedParamKeys);
      } catch (e) {
        if (e instanceof MappingError) {
          return new HttpError(
            400,
            "Could not alter item because your request had too many parameters",
            e.message
          );
        }
        throw e;
      }

      for (const key of Object.keys(body)) {
        if (!types[key] || !types[key].public || types[key].auto) {
          return new HttpError(
            400,
            "Could not alter item because your request had too many parameters",
            `"${key}" does not exist`
          );
        }
      }

      const optionalsToBeRemoved = {};
      Object.keys(types)
        .filter(
          (key) =>
            !(key in body) &&
            types[key].public &&
            !types[key].readOnly &&
            (types[key].optional || types[key].default !== undefined)
        )
        .forEach((key) => {
          optionalsToBeRemoved[key] = null;
        });

      const paramOverlap = Object.keys(body)
        .filter((key) => fullParams[key])
        .filter((key) => body[key] !== fullParams[key]);
      if (paramOverlap.length > 0) {
        return new HttpError(
          400,
          "Could not alter item because it would change a path id",
          JSON.stringify(paramOverlap)
        );
      }

      let model = new Model(dbs);
      let creatingNew = false;
      try {
        await model.loadOne(fullParams);
      } catch (e) {
        if (e instanceof NotFound) {
          if (!canCreate) {
            return new HttpError(404, nameFromPrefix(prefix) + " not found");
          }
          creatingNew = true;
          model = new Model(dbs, [{}]);
        } else {
          throw e;
        }
      }
      const contentBefore = model.content;
      model.content = {
        ...contentBefore,
        ...body,
        ...optionalsToBeRemoved,
        ...fullParams,
      };

      Object.keys(types)
        .filter(
          (key) =>
            !(key in body) &&
            types[key].public &&
            !types[key].readOnly &&
            types[key].default !== undefined
        )
        .forEach((key) => {
          model.content = model.getWithDefaults([model.content], key)[0];
        });

      if (creatingNew) {
        await model.store();
      } else {
        await model.update();
      }
      if (trackChanges) {
        await trackChanges(me, contentBefore, model.content);
      }

      if (creatingNew) {
        return new HttpCode(201, model.content[String(idField)]);
      }
      return model.content[String(idField)];
    }
  );
  return putF;
};
