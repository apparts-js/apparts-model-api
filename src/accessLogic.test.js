const { and, andS, or, orS } = require("./accessLogic");

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
  });

  it("should await auth function results", async () => {
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

  it("should handle promise rejections", async () => {
    expect(
      await or(
        async () => true,
        async () => {
          throw new Error("ups");
        },
        async () => {
          throw new Error("ups");
        }
      )()
    ).toBe(true);

    await expect(() =>
      or(
        async () => {
          throw new Error("ups");
        },
        async () => {
          throw new Error("ups");
        }
      )()
    ).rejects.toThrow("ups");
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
  });

  it("should await auth function results", async () => {
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

  it("should handle promise rejections", async () => {
    await expect(() =>
      and(
        async () => true,
        async () => {
          throw new Error("ups");
        },
        async () => false,
        async () => {
          throw new Error("ups");
        }
      )()
    ).rejects.toThrow("ups");
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
  });

  it("should await auth function results", async () => {
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
  it("should handle promise rejections", async () => {
    expect(
      await or(
        async () => true,
        async () => {
          throw new Error("ups");
        },
        async () => {
          throw new Error("ups");
        }
      )()
    ).toBe(true);

    await expect(() =>
      orS(
        async () => {
          throw new Error("ups");
        },
        async () => {
          throw new Error("ups");
        },
        async () => true
      )()
    ).rejects.toThrow("ups");
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
  });

  it("should await auth function results", async () => {
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
  it("should handle promise rejections", async () => {
    await expect(() =>
      andS(
        async () => true,
        async () => {
          throw new Error("ups");
        },
        async () => false,
        async () => {
          throw new Error("ups");
        }
      )()
    ).rejects.toThrow("ups");
  });
});
