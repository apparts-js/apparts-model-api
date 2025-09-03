import JWT from "jsonwebtoken";
import { error } from "@apparts/backend-test";
export const jwt = (rest = {}, action = "login") =>
  JWT.sign(
    {
      action,
      ...rest,
    },
    "rsoaietn0932lyrstenoie3nrst",
    { expiresIn: "1 day" }
  ) as string;

export const checkJWT = (request, fname, checkType) => {
  describe("auth", () => {
    test("should reject with no auth", async () => {
      const response = await request();

      expect(response.statusCode).toBe(401);
      expect(response.body).toMatchObject(error("Unauthorized"));
      expect(checkType(response, fname)).toBeTruthy();
    });

    test("should reject with failed login, token wrong", async () => {
      const response = await request().set("Authorization", "Bearer nope");
      expect(response.statusCode).toBe(401);
      expect(response.body).toMatchObject(error("Token invalid"));
      expect(checkType(response, fname)).toBeTruthy();
    });
  });
};
