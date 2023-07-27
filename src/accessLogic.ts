import {
  HttpError,
  httpErrorSchema,
  ReturnsArray,
  validJwt,
} from "@apparts/prep";
import { Request } from "express";
import { Schema } from "@apparts/types";

type FnType<Params extends unknown[]> = {
  (...params: Params): Promise<void> | void;
  description?: string;
  returns?: ReturnsArray;
};

const unique = (vals: Schema<any, any>[]) => {
  return Array.from(
    new Map(vals.map((v) => [JSON.stringify(v.getType()), v])).values()
  );
};

// check all conditions in parallel
export const and = <Params extends unknown[]>(...fs: FnType<Params>[]) => {
  const fn = async (...param: Params) => {
    await Promise.all(fs.map((f) => f(...param)));
  };
  fn.returns = unique(fs.map((f) => f.returns || []).flat());
  fn.description = `(${fs.map((f) => f.description || "").join(" and ")})`;
  return fn;
};

export const or = <Params extends unknown[]>(...fs: FnType<Params>[]) => {
  const fn = async (...params: Params) => {
    let counter = fs.length;
    return await new Promise<void>((res, rej) =>
      fs.forEach(async (f) => {
        try {
          await f(...params);
          res();
        } catch (e) {
          counter--;
          if (counter === 0) {
            rej(e);
          }
        }
      })
    );
  };
  fn.returns = unique(fs.map((f) => f.returns || []).flat());
  fn.description = `(${fs.map((f) => f.description || "").join(" or ")})`;
  return fn;
};

// check all conditions in sequence
export const andS = <Params extends unknown[]>(...fs: FnType<Params>[]) => {
  const fn = async (...params: Params) => {
    for (const f of fs) {
      await f(...params);
    }
  };
  fn.returns = unique(fs.map((f) => f.returns || []).flat());
  fn.description = `(${fs.map((f) => f.description || "").join(" and ")})`;
  return fn;
};

export const orS = <Params extends unknown[]>(...fs: FnType<Params>[]) => {
  const fn = async (...params: Params) => {
    const last = fs.pop();
    for (const f of fs) {
      try {
        await f(...params);
        return;
      } catch (e) {
        /**/
      }
    }
    if (last) {
      await last(...params);
    }
  };
  fn.returns = unique(fs.map((f) => f.returns || []).flat());
  fn.description = `(${fs.map((f) => f.description || "").join(" or ")})`;
  return fn;
};

// anybody
export const anybody = () => Promise.resolve();

export const rejectAccess = () => {
  throw new HttpError(403, "You don't have the rights to retrieve this.");
};
rejectAccess.returns = [
  httpErrorSchema(403, "You don't have the rights to retrieve this."),
];

export const accessFn = <Params extends unknown[]>(params: {
  fn: FnType<Params>;
  description?: string;
  returns?: ReturnsArray;
}) => {
  params.fn.description = params.description;
  params.fn.returns = params.returns;
  return params.fn;
};

export const jwtAnd = <TokenContent>(webtokenkey: string) => {
  if (typeof webtokenkey !== "string") {
    throw new Error("jwtAnd expects a webtokenkey as parameter");
  }

  return (...fs: FnType<[Request, TokenContent]>[]) => {
    if (fs.length !== 0 && typeof fs[0] !== "function") {
      throw new Error(
        "jwtAnd returns a validation function that expects 0 or more access functions as parameter. But got non-function."
      );
    }
    const andFns = and(...fs);
    const jwtFn = validJwt(webtokenkey);
    const fn = async (req: Request) => {
      const token = (await jwtFn(req)) as TokenContent;
      await andFns(req, token);
      return token;
    };
    fn.returns = unique(
      [...jwtFn.returns, ...fs.map((f) => f.returns || [])].flat()
    );
    fn.description =
      jwtFn.description +
      `\n\n${fs.map((f) => f.description || "").join(" and ")}`;
    return fn;
  };
};
