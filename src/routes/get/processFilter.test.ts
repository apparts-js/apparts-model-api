import * as types from "@apparts/types";
import { typeIsKnownForDottedPath } from "./processFilter";

describe("typeIsKnownForDottedPath", () => {
  it("should return false for oneOf", async () => {
    const schema = types.obj({
      oneOf: types.oneOf([]),
    });
    expect(typeIsKnownForDottedPath(["oneOf"], schema.getType())).toBe(false);
  });
  it("should return false for oneOf in obj", async () => {
    const schema = types.obj({
      obj: types.obj({
        oneOf: types.oneOf([]),
      }),
    });
    expect(typeIsKnownForDottedPath(["obj", "oneOf"], schema.getType())).toBe(
      false
    );
  });
  it("should return true for str in obj", async () => {
    const schema = types.obj({
      obj: types.obj({
        str: types.string(),
      }),
    });
    expect(typeIsKnownForDottedPath(["obj", "str"], schema.getType())).toBe(
      true
    );
  });
});
