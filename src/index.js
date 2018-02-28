import path from "path";
import fs from "fs";
import Generator from "./lib/Generator";

const defaultInputPath = "./input.json";
const defaultOutputPath = "./out";

export default function (options, done) {
  const {
    input = defaultInputPath,
    output = defaultOutputPath,
  } = options;

  const inputPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
  const outputPath = path.isAbsolute(output) ? output : path.resolve(process.cwd(), output);

  const inputObj = JSON.parse(path.readFileSync(inputPath));

  const g = new Generator(inputObj, true, outputPath);

  g.write()
    .then(done)
    .catch(err => throw err);
}
