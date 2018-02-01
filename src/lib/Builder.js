import { resolve } from "path";

import memFs from "mem-fs";
import editor from "mem-fs-editor";

import * as templateHelper from "./templateHelper";
import Parser from "./Parser";

/**
 * @title Builder
 * @notice Builder read and write template with the input.
 */
export default class Builder {
  constructor(input) {
    this.input = input;
    this.parser = new Parser(input);

    this.store = memFs.create();
    this.fs = editor.create(this.store);
  }

  /**
   * @notice builds templates and generates truffle project.
   */
  build() {
    const parseResult = this.parser.parse();

    return new Promise((done) => {
      this.writeContracts(parseResult);
      this.writeMigrations(parseResult);
      this.writeTest(parseResult);

      this.fs.commit([], done);
    });
  }

  writeContracts(parseResult) {
    const dirName = "contracts";

    // crowdsale
    this.fs.copyTpl(
      this.tmplPath(dirName, "Crowdsale.sol.ejs"),
      this.targetPath(dirName, "Crowdsale.sol"),
      { input: this.input, helper: templateHelper, parseResult },
    );

    // token
    this.fs.copyTpl(
      this.tmplPath(dirName, "Token.sol.ejs"),
      this.targetPath(dirName, "Token.sol"),
      { input: this.input, helper: templateHelper, parseResult },
    );
  }

  writeMigrations(parseResult) {
    const dirName = "migrations";

    this.fs.copyTpl(
      this.tmplPath(dirName, "2_deploy_contracts.js.ejs"),
      this.targetPath(dirName, "2_deploy_contracts.js"),
      { input: this.input, helper: templateHelper, parseResult },
    );
  }

  writeTest(parseResult) {
    const dirName = "test";

    // crowdsale
    this.fs.copyTpl(
      this.tmplPath(dirName, "Crowdsale.js.ejs"),
      this.targetPath(dirName, "Crowdsale.js"),
      { input: this.input, helper: templateHelper, parseResult },
    );

    // token
    this.fs.copyTpl(
      this.tmplPath(dirName, "Token.js.ejs"),
      this.targetPath(dirName, "Token.js"),
      { input: this.input, helper: templateHelper, parseResult },
    );
  }
}
