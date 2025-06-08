import {
  createParams,
  nameFromPrefix,
  reverseMap,
  createBody,
  createIdParam,
  makeSchema,
  MappingError,
} from "./common";
import { HttpError, prepare, httpErrorSchema } from "@apparts/prep";
import { NotFound } from "@apparts/model";
import { GeneratorFnParams } from "./types";
import { GenericQueriable } from "@apparts/db";

const makePatchBody = (types) => {
  for (const key in types) {
    const type = types[key];
    if (type.optional) {
      const subType = type;
      delete subType.optional;
      delete subType.public;
      types[key] = {
        type: "oneOf",
        optional: true,
        alternatives: [subType, { type: "null" }],
      };
    } else {
      type.optional = true;
    }
  }
  return types;
};

export const generatePatch = <AccessType>(
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
    throw new Error(`Route (patch) ${prefix} has no access control function.`);
  }

  const schema = Model.getSchema();
  const patchF = prepare(
    {
      title: title || "Patch " + nameFromPrefix(prefix),
      description,
      hasAccess: authF,
      receives: {
        params: makeSchema({
          ...createParams(prefix, schema),
          [idField]: createIdParam(Model, idField),
        }),
        body: makeSchema({
          ...makePatchBody(createBody(prefix, Model)),
        }),
      },
      returns: [
        makeSchema({
          ...createIdParam(Model, idField),
        }),
        httpErrorSchema(
          400,
          "Could not alter item because your request had too many parameters"
        ),
        httpErrorSchema(
          400,
          "Could not alter item because it would change a path id"
        ),
        httpErrorSchema(404, nameFromPrefix(prefix) + " not found"),
      ],
    },
    async (req, _res, me) => {
      const { dbs, params } = req as typeof req & {
        dbs: GenericQueriable;
      };
      let { body } = req;

      const types = Model.getSchema().getModelType();
      try {
        body = reverseMap(body, types);
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
            body[key] === null && types[key].public && types[key].optional
        )
        .forEach((key) => {
          optionalsToBeRemoved[key] = null;
        });

      const paramOverlap = Object.keys(body)
        .filter((key) => params[key])
        .filter((key) => body[key] !== params[key]);
      if (paramOverlap.length > 0) {
        return new HttpError(
          400,
          "Could not alter item because it would change a path id",
          JSON.stringify(paramOverlap)
        );
      }

      const model = new Model(dbs);
      try {
        await model.loadOne(params);
      } catch (e) {
        if (e instanceof NotFound) {
          return new HttpError(404, nameFromPrefix(prefix) + " not found");
        }
        throw e;
      }
      const contentBefore = model.content;
      model.content = { ...model.content, ...body, ...optionalsToBeRemoved };
      await model.update();
      trackChanges && (await trackChanges(me, contentBefore, model.content));
      return model.content[idField];
    }
  );
  return patchF;
};
