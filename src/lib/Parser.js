import moment from "moment";
import {
  writeTap,
  convertDateString,
} from "./templateHelper";

// common constructor parameters for ZeppelinBaseCrowdsale & MiniMeBaseCrowdsale
// [ [solidity data type], [path for lodash.get] ]
const defaultConstructors = input => [
  ["uint", "input.sale.start_time", input.sale.start_time],
  ["uint", "input.sale.end_time", input.sale.end_time],
  ["uint", "input.sale.rate.base_rate", input.sale.rate.base_rate],
  ["uint", "input.sale.coeff", input.sale.coeff],
  ["uint", "input.sale.max_cap", input.sale.max_cap],
  ["uint", "input.sale.min_cap", input.sale.min_cap],
  ["address", "address.vault"],
  ["address", "address.locker"],
  ["address", "input.sale.new_token_owner", input.sale.new_token_owner],
  ["address", "address.token"],
];

const arrayConvertor = array => (key, convertor) =>
  array.map(s => (convertor ? convertor(s[ key ]) : s[ key ]));

/**
 * @title Parser
 * @notice Parses user's input to generate inheritance tree for token and crowdsale.
 * The result will be used to generate contract & migration file.
 */
export default class Parser {
  constructor(input) {
    this.input = input;
  }

  parse() {
    const { input } = this;

    const f = () => ({
      parentsList: [], // super contract name
      importStatements: [], // path to import suprt contract
    });

    const token = f(); // for token contract
    const crowdsale = f(); // for crowdsale contract
    const migration = {}; // for truffle migration script
    const constructors = {}; // for constructors for Crowdsale, Locker
    let initBody = ""; // BaseCrowdsale.init function body

    // Ownable for Crowdsale
    crowdsale.parentsList.push("Ownable");
    crowdsale.importStatements.push("import \"./base/zeppelin/ownership/Ownable.sol\";");
    constructors.Ownable = [];

    // HolderBase.initHolders
    const numTap = 2;
    const etherHolders = input.sale.distribution.ether.map(e => e.ether_holder);
    const etherRatios = input.sale.distribution.ether.map(e => e.ether_ratio);

    initBody += `
${ writeTap(numTap) }vault.initHolders(
${ writeTap(numTap + 1) }[ ${ etherHolders.map(i => `"${ i }"`).join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ etherRatios.join(`\n${ writeTap(numTap + 2) }`) } ]
${ writeTap(numTap) });
`;

    // parse input.locker
    migration.Lockers = this.parseLockers();

    // parse input.token
    if (input.token.token_type.is_minime) {
      token.parentsList.push("MiniMeToken");
      token.importStatements.push("import \"./base/minime/MiniMeToken.sol\";");

      crowdsale.parentsList.push("MiniMeBaseCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/MiniMeBaseCrowdsale.sol\";");

      constructors.MiniMeBaseCrowdsale = defaultConstructors(input);
    } else {
      token.parentsList.push("Mintable");
      token.importStatements.push("import \"./base/zeppelin/token/Mintable.sol\";");

      crowdsale.parentsList.push("ZeppelinBaseCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/ZeppelinBaseCrowdsale.sol\";");

      constructors.ZeppelinBaseCrowdsale = defaultConstructors(input);

      if (input.token.token_option && input.token.token_option.burnable) {
        token.parentsList.push("BurnableToken");
        token.importStatements.push("import \"./base/zeppelin/token/BurnableToken.sol\";");
      }

      if (input.token.token_option && input.token.token_option.pausable) {
        token.parentsList.push("Pausable");
        token.importStatements.push("import \"./base/zeppelin/lifecycle/Pausable.sol\";");
      }
    }

    // parse input.sale

    // 1. BonusCrowdsale
    if (!input.sale.rate.is_static) {
      crowdsale.parentsList.push("BonusCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/BonusCrowdsale.sol\";");

      constructors.BonusCrowdsale = [];
    }

    // 2. PurchaseLimitedCrowdsale
    if (input.sale.valid_purchase.max_purchase_limit.gt(0)) {
      crowdsale.parentsList.push("PurchaseLimitedCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/PurchaseLimitedCrowdsale.sol\";");

      constructors.PurchaseLimitedCrowdsale = [["uint", "input.sale.valid_purchase.max_purchase_limit", input.sale.valid_purchase.max_purchase_limit]];
    }

    // 3. MinimumPaymentCrowdsale
    if (input.sale.valid_purchase.min_purchase_limit.gt(0)) {
      crowdsale.parentsList.push("MinimumPaymentCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/MinimumPaymentCrowdsale.sol\";");

      constructors.MinimumPaymentCrowdsale = [["uint", "input.sale.valid_purchase.min_purchase_limit", input.sale.valid_purchase.min_purchase_limit]];
    }

    // 4. KYCCrowdsale & StagedCrowdsale
    if (input.sale.stages.length > 0) {
      if (input.sale.stages.findIndex(s => s.kyc === true) >= 0) {
        crowdsale.parentsList.push("KYCCrowdsale");
        crowdsale.importStatements.push("import \"./base/crowdsale/KYCCrowdsale.sol\";");

        constructors.KYCCrowdsale = [["address", "address.kyc"]];
      }

      crowdsale.parentsList.push("StagedCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/StagedCrowdsale.sol\";");

      constructors.StagedCrowdsale = [["uint", "input.sale.stages_length", input.sale.stages.length]]; // *_length => *.length

      // StagedCrowdsale.initPeriods
      const periodConvertor = arrayConvertor(input.sale.stages);

      initBody += `
${ writeTap(numTap) }super.initPeriods(
${ writeTap(numTap + 1) }[ ${ periodConvertor("start_time", convertDateString).join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ periodConvertor("end_time", convertDateString).join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ periodConvertor("cap_ratio").join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ periodConvertor("max_purchase_limit").join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ periodConvertor("min_purchase_limit").join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ periodConvertor("kyc").join(`\n${ writeTap(numTap + 2) }`) } ]
${ writeTap(numTap) });
`;
    }

    // Locker.lock()
    for (const { address, is_straight, release } of input.locker.beneficiaries) {
      const releaseConvertor = arrayConvertor(release);

      initBody += `
${ writeTap(numTap) }locker.lock(
${ writeTap(numTap + 1) }"${ address }",
${ writeTap(numTap + 1) }${ is_straight },
${ writeTap(numTap + 1) }[ ${ releaseConvertor("release_time", convertDateString).join(`\n${ writeTap(numTap + 2) }`) } ],
${ writeTap(numTap + 1) }[ ${ releaseConvertor("release_ratio").join(`\n${ writeTap(numTap + 2) }`) } ]
${ writeTap(numTap) });
`;
    }

    // constructor for The Crowdsale
    constructors.Crowdsale = [];
    crowdsale.parentsList.forEach((parent) => {
      constructors.Crowdsale = [...constructors.Crowdsale, ...constructors[ parent ]];
    });

    return {
      token,
      crowdsale,
      migration,
      constructors,
      initBody,
    };
  }

  parseLockers() {
    const { input } = this;
    const ret = [];

    if (!input.locker.use_locker) {
      return ret;
    }

    input.locker.beneficiaries.forEach((b) => {
      ret.push([
        // TODO: fill locker constructor parameters
      ]);
    });

    return ret;
  }
}
