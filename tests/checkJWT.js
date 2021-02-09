const JWT = require("jsonwebtoken");
const { error } = require("./");
const jwt = (rest, action = "login") =>
  JWT.sign(
    {
      action,
      ...rest,
    },
    "rsoaietn0932lyrstenoie3nrst",
    { expiresIn: "1 day" }
  );

const checkJWT = (request, fname, checkType) => {
  test("No auth", async () => {
    const response = await request();

    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(checkType(response, fname)).toBeTruthy();
  });

  test("Failed login, action wrong", async () => {
    const response = await request().set(
      "Authorization",
      "Bearer " + jwt("mike@meinvenue.de", false, "hello")
    );
    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(checkType(response, fname)).toBeTruthy();
  });
  test("Failed login, token wrong", async () => {
    const response = await request().set("Authorization", "Bearer nope");
    expect(response.statusCode).toBe(401);
    expect(response.body).toMatchObject(error("Token invalid"));
    expect(checkType(response, fname)).toBeTruthy();
  });
};

module.exports = { checkJWT, jwt };
