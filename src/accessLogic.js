// check all conditions in parallel
const and =
  (...fs) =>
  async (...params) =>
    (await Promise.all(fs.map((f) => f(...params)))).every((a) => a);
const or =
  (...fs) =>
  async (...params) => {
    let counter = fs.length,
      done = false;
    return new Promise((res, rej) =>
      fs.forEach(async (f) => {
        let result;
        try {
          result = await f(...params);
        } catch (e) {
          done = true;
          rej(e);
        }
        if (result && !done) {
          done = true;
          res(true);
        } else {
          counter--;
          if (counter === 0) {
            res(false);
          }
        }
      })
    );
  };

// check all conditions in sequence
const andS =
  (...fs) =>
  async (...params) =>
    await fs.reduce(
      async (a, b) => (await a) && (await b(...params)),
      Promise.resolve(true)
    );
const orS =
  (...fs) =>
  async (...params) =>
    await fs.reduce(
      async (a, b) => (await a) || (await b(...params)),
      Promise.resolve(false)
    );

// anybody
const anybody = () => true;

module.exports = { and, andS, or, orS, anybody };
