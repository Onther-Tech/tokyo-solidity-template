import Generator from "../src/lib/Generator";
import rimraf from "rimraf";

const should = require("chai")
  .use(require("chai-as-promised"))
  .should();

const sampleInput = require("./tokyo-test-data/sample1.json");

describe("Generator", () => {
  it("should generate", async () => {
    const outName = "test1_out";
    const g = new Generator(sampleInput, outName);

    await g.write();
    // rimraf.sync(outName);
  });
});
