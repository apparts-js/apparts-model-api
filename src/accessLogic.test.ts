import { HttpError } from "@apparts/prep";
import { and, andS, anybody, or, orS, rejectAccess } from "./accessLogic";
import { Request } from "express";

const exec = (fn: (req: Request) => Promise<unknown>) =>
  fn("blub" as unknown as Request);

describe("or", () => {
  it("should let in based on or", async () => {
    await expect(exec(or(anybody, rejectAccess))).resolves.toBeUndefined();

    await expect(
      exec(or(rejectAccess, rejectAccess, rejectAccess, anybody))
    ).resolves.toBeUndefined();

    await expect(
      exec(or(rejectAccess, rejectAccess, rejectAccess))
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("should be stackable", async () => {
    await expect(exec(or(or(anybody)))).resolves.toBeUndefined();
    await expect(exec(or(or(rejectAccess)))).rejects.toBeInstanceOf(HttpError);
  });

  it("should await auth function results", async () => {
    await expect(
      exec(
        or(
          async () => {
            throw new Error("ups");
          },
          async () => {
            throw new Error("ups");
          },
          async () => {
            throw new Error("ups");
          }
        )
      )
    ).rejects.toThrow("ups");
    await expect(
      exec(
        or(
          async () => {
            throw new Error("ups");
          },
          async () => {
            return;
          },
          async () => {
            throw new Error("ups");
          }
        )
      )
    ).resolves.toBeUndefined();
  });

  it("should create description", async () => {
    const f1 = () => Promise.resolve();
    f1.description = "has f1 rights";
    const f2 = () => Promise.resolve();
    f2.description = "has f2 rights";

    expect(or(f1, f2).description).toBe("(has f1 rights or has f2 rights)");
    expect(or(or(f1, f2), f2).description).toBe(
      "((has f1 rights or has f2 rights) or has f2 rights)"
    );
  });

  it("should create returns", async () => {
    expect(or(anybody).returns.length).toBe(0);
    expect(or(anybody, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(or(anybody, or(rejectAccess)).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(or(rejectAccess, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
  });
});

describe("and", () => {
  it("should do logical and", async () => {
    await expect(
      exec(and(() => Promise.resolve(), rejectAccess))
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      exec(
        and(() => {
          return;
        }, rejectAccess)
      )
    ).rejects.toBeInstanceOf(HttpError);

    await expect(exec(and(anybody, anybody, anybody))).resolves.toBeUndefined();
  });

  it("should be stackable", async () => {
    await expect(exec(and(and(anybody)))).resolves.toBeUndefined();
    await expect(exec(and(and(rejectAccess)))).rejects.toBeInstanceOf(
      HttpError
    );
  });

  it("should await auth function results", async () => {
    await expect(
      exec(
        and(
          async () => {
            return;
          },
          async () => {
            return;
          },
          async () => {
            throw new Error("no");
          }
        )
      )
    ).rejects.toThrow("no");
    await expect(
      exec(
        and(
          async () => {
            return;
          },
          async () => {
            return;
          },
          async () => {
            return;
          }
        )
      )
    ).resolves.toBeUndefined();
  });

  it("should create description", async () => {
    const f1 = () => Promise.resolve();
    f1.description = "has f1 rights";
    const f2 = () => Promise.resolve();
    f2.description = "has f2 rights";

    expect(and(f1, f2).description).toBe("(has f1 rights and has f2 rights)");
    expect(and(and(f1, f2), f2).description).toBe(
      "((has f1 rights and has f2 rights) and has f2 rights)"
    );
  });

  it("should create returns", async () => {
    expect(and(anybody).returns.length).toBe(0);
    expect(and(anybody, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(and(anybody, and(rejectAccess)).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(and(rejectAccess, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
  });
});

describe("orS", () => {
  it("should let in based on or", async () => {
    await expect(exec(orS(anybody, rejectAccess))).resolves.toBeUndefined();

    await expect(
      exec(orS(rejectAccess, rejectAccess, rejectAccess, anybody))
    ).resolves.toBeUndefined();

    await expect(
      exec(orS(rejectAccess, rejectAccess, rejectAccess))
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("should be stackable", async () => {
    await expect(exec(orS(orS(anybody)))).resolves.toBeUndefined();
    await expect(exec(orS(orS(rejectAccess)))).rejects.toBeInstanceOf(
      HttpError
    );
  });

  it("should await auth function results", async () => {
    await expect(
      exec(
        orS(
          async () => {
            throw new Error("ups");
          },
          async () => {
            throw new Error("ups");
          },
          async () => {
            throw new Error("ups");
          }
        )
      )
    ).rejects.toThrow("ups");
    await expect(
      exec(
        orS(
          async () => {
            throw new Error("ups");
          },
          async () => {
            return;
          },
          async () => {
            throw new Error("ups");
          }
        )
      )
    ).resolves.toBeUndefined();
  });
  it("should create description", async () => {
    const f1 = () => Promise.resolve();
    f1.description = "has f1 rights";
    const f2 = () => Promise.resolve();
    f2.description = "has f2 rights";

    expect(orS(f1, f2).description).toBe("(has f1 rights or has f2 rights)");
    expect(orS(orS(f1, f2), f2).description).toBe(
      "((has f1 rights or has f2 rights) or has f2 rights)"
    );
  });
  it("should create returns", async () => {
    expect(orS(anybody).returns.length).toBe(0);
    expect(orS(anybody, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(orS(anybody, orS(rejectAccess)).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(orS(rejectAccess, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
  });
});

describe("andS", () => {
  it("should do logical and", async () => {
    await expect(exec(andS(anybody, rejectAccess))).rejects.toBeInstanceOf(
      HttpError
    );

    await expect(
      exec(andS(anybody, anybody, anybody, rejectAccess))
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      exec(andS(anybody, anybody, anybody))
    ).resolves.toBeUndefined();
  });

  it("should be stackable", async () => {
    await expect(exec(andS(andS(anybody)))).resolves.toBeUndefined();
    await expect(exec(andS(andS(rejectAccess)))).rejects.toBeInstanceOf(
      HttpError
    );
  });

  it("should await auth function results", async () => {
    await expect(
      exec(
        andS(
          async () => {
            return;
          },
          async () => {
            return;
          },
          async () => {
            throw new Error("ups");
          }
        )
      )
    ).rejects.toThrow("ups");
    await expect(
      exec(
        andS(
          async () => {
            return;
          },
          async () => {
            return;
          },
          async () => {
            return;
          }
        )
      )
    ).resolves.toBeUndefined();
  });

  it("should create description", async () => {
    const f1 = () => Promise.resolve();
    f1.description = "has f1 rights";
    const f2 = () => Promise.resolve();
    f2.description = "has f2 rights";

    expect(andS(f1, f2).description).toBe("(has f1 rights and has f2 rights)");
    expect(andS(andS(f1, f2), f2).description).toBe(
      "((has f1 rights and has f2 rights) and has f2 rights)"
    );
  });

  it("should create returns", async () => {
    expect(andS(anybody).returns.length).toBe(0);
    expect(andS(anybody, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(andS(anybody, andS(rejectAccess)).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
    expect(andS(rejectAccess, rejectAccess).returns).toMatchObject([
      { keys: { code: { value: 403 } } },
    ]);
  });
});
