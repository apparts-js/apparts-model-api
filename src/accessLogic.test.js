const { and, andS, or, orS, anybody } = require("./accessLogic");

describe("or", () => {
  it("should let in based on or", async () => {
    expect(
      await or(
        () => true,
        () => false
      )()
    ).toBe(true);

    expect(
      await or(
        () => false,
        () => false,
        () => false,
        () => true
      )()
    ).toBe(true);

    expect(
      await or(
        () => false,
        () => false,
        () => false
      )()
    ).toBe(false);

    expect(
      await or(
        async () => false,
        async () => false,
        async () => false
      )()
    ).toBe(false);
    expect(
      await or(
        async () => false,
        async () => true,
        async () => false
      )()
    ).toBe(true);
  });
});

describe("and", () => {
  it("should do logical and", async () => {
    expect(
      await and(
        () => true,
        () => false
      )()
    ).toBe(false);

    expect(
      await and(
        () => true,
        () => true,
        () => true,
        () => false
      )()
    ).toBe(false);

    expect(
      await and(
        () => true,
        () => true,
        () => true
      )()
    ).toBe(true);

    expect(
      await and(
        async () => true,
        async () => true,
        async () => false
      )()
    ).toBe(false);
    expect(
      await and(
        async () => true,
        async () => true,
        async () => true
      )()
    ).toBe(true);
  });
});

describe("orS", () => {
  it("should let in based on or", async () => {
    expect(
      await orS(
        () => true,
        () => false
      )()
    ).toBe(true);

    expect(
      await orS(
        () => false,
        () => false,
        () => false,
        () => true
      )()
    ).toBe(true);

    expect(
      await orS(
        () => false,
        () => false,
        () => false
      )()
    ).toBe(false);

    expect(
      await orS(
        async () => false,
        async () => false,
        async () => false
      )()
    ).toBe(false);
    expect(
      await orS(
        async () => false,
        async () => true,
        async () => false
      )()
    ).toBe(true);
  });
});

describe("andS", () => {
  it("should do logical and", async () => {
    expect(
      await andS(
        () => true,
        () => false
      )()
    ).toBe(false);

    expect(
      await andS(
        () => true,
        () => true,
        () => true,
        () => false
      )()
    ).toBe(false);

    expect(
      await andS(
        () => true,
        () => true,
        () => true
      )()
    ).toBe(true);

    expect(
      await andS(
        async () => true,
        async () => true,
        async () => false
      )()
    ).toBe(false);
    expect(
      await andS(
        async () => true,
        async () => true,
        async () => true
      )()
    ).toBe(true);
  });
});
