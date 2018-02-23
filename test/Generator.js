import rimraf from "rimraf";
import schema from "tokyo-schema";
import Generator from "../src/lib/Generator";

const verbose = process.env.VERBOSE || false;

const should = require("chai")
  .use(require("chai-as-promised"))
  .should();

const remove = (...args) => !verbose && rimraf.sync(...args);

const sampleInput = schema.validate(require("tokyo-test-data/sample1.json")).value;

describe("Generator", () => {
  it("should generate", async () => {
    const outName = "test1_out";
    const g = new Generator(sampleInput, outName);

    await g.write();
    remove(outName);
  });
});
