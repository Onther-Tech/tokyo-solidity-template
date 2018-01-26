import { resolve } from "path";

import memFs from "mem-fs";
import editor from "mem-fs-editor";

/**
 * @title Builder
 * @notice Builder builds templates into smart contracts based on user input.
 */
export default class Builder {
  constructor(input) {
    this.input = input;

    this.store = memFs.create();
    this.fs = editor.create(this.store);
  }

  /**
   * @notice builds templates and generates truffle project.
   */
  build() {
    return new Promise((done) => {
      this.writeContracts();
      this.writeMigrations();
      this.writeTest();

      this.fs.commit([], done);
    });
  }

  writeContracts() {
    const dirName = "contracts";

    // crowdsale
    this.fs.copyTpl(
      this.tmplPath(dirName, "Crowdsale.sol.ejs"),
      this.targetPath(dirName, "Crowdsale.sol"),
      { input: this.input },
    );

    // token
    this.fs.copyTpl(
      this.tmplPath(dirName, "Token.sol.ejs"),
      this.targetPath(dirName, "Token.sol"),
      { input: this.input },
    );
  }

  writeMigrations() {
    const dirName = "migrations";

    this.fs.copyTpl(
      this.tmplPath(dirName, "2_deploy_contracts.js.ejs"),
      this.targetPath(dirName, "2_deploy_contracts.js"),
      { input: this.input },
    );
  }

  writeTest() {
    const dirName = "test";

    // crowdsale
    this.fs.copyTpl(
      this.tmplPath(dirName, "Crowdsale.js.ejs"),
      this.targetPath(dirName, "Crowdsale.js"),
      { input: this.input },
    );

    // token
    this.fs.copyTpl(
      this.tmplPath(dirName, "Token.js.ejs"),
      this.targetPath(dirName, "Token.js"),
      { input: this.input },
    );
  }
}
