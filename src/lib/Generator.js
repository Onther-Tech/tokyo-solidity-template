import { resolve, join } from "path";
import mkdirp from "mkdirp";
import { ncp } from "ncp";

import Logger from "./Logger";
import Builder from "./Builder";

const logger = new Logger(true);

const defaultTargetDirectoryName = "out";
const defaultTargetPath = resolve(__dirname, "../../");
const defaultTemplPath = resolve(__dirname, "../../templates");
const defaultBaseContractPath = resolve(__dirname, "../../tokyo-reusable-crowdsale/contracts");
const defaultBaseTestHelperPath = resolve(__dirname, "../../tokyo-reusable-crowdsale/test/helpers");

/**
 * @title Generator
 * @notice Generator make directories for output, build template.
 */
export default class Generator extends Builder {
  constructor(
    input,
    targetDirectoryName = defaultTargetDirectoryName,
    tmplPath = defaultTemplPath,
    baseContractPath = defaultBaseContractPath,
    baseTestHelperPath = defaultBaseTestHelperPath,
  ) {
    super(input);

    const targetPath = resolve(defaultTargetPath, targetDirectoryName); // ../../out

    this.path = {
      tmpl: tmplPath,
      target: {
        root: targetPath,
        contracts: resolve(targetPath, "./contracts"),
        migrations: resolve(targetPath, "./migrations"),
        test: resolve(targetPath, "./test"),
      },
      base: {
        contracts: baseContractPath,
        test: baseTestHelperPath,
      },
    };
  }

  async write() {
    logger.log("generator writting...");

    this._makeDirectories();
    await this._copyBaseContracts();
    await this._copyBaseTestHelpers();

    await super.build(this.path); // Copy templates with user input
  }

  _makeDirectories() {
    logger.log("write directories...");

    mkdirp(this.path.target.contracts);
    mkdirp(this.path.target.migrations);
    mkdirp(this.path.target.test);
  }

  _copyBaseContracts() {
    const sourcePath = this.path.base.contracts;
    const targetPath = resolve(this.path.target.contracts, "./base");

    logger.log("copy base contracts...");
    logger.log("from", sourcePath);
    logger.log("to", targetPath);

    return ncp(sourcePath, targetPath);
  }

  _copyBaseTestHelpers() {
    const sourcePath = this.path.base.test;
    const targetPath = resolve(this.path.target.test, "./helpers");

    logger.log("copy test helpers...");
    logger.log("from", sourcePath);
    logger.log("to", targetPath);

    return ncp(sourcePath, targetPath);
  }

  targetPath(...args) {
    return join(this.path.target.root, ...args);
  }

  tmplPath(...args) {
    return join(this.path.tmpl, ...args);
  }
}
