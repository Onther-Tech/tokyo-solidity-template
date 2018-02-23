import rimraf from "rimraf";
import schema from "tokyo-schema/src";
import Generator from "../src/lib/Generator";

const verbose = process.env.VERBOSE || false;

const should = require("chai")
  .use(require("chai-as-promised"))
  .should();

const remove = (...args) => !verbose && rimraf.sync(...args);

describe("Generator", () => {
  it("should generate", async () => {
    const outName = "test1_out";
    const g = new Generator(require("tokyo-test-data/sample1.json"), outName);

    await g.write();
    remove(outName);
  });
});
