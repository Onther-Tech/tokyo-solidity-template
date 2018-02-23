import moment from "moment";
import {
  writeTap,
  convertAddress,
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
];

const arrayConvertor = array => (key, convertor) =>
  array.map(s => (convertor ? convertor(s[ key ]) : s[ key ]));

const BNConvertor = bn => bn.toFixed(0);

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

    const meta = {};
    const token = f(); // for token contract
    const crowdsale = f(); // for crowdsale contract
    const migration = {}; // for truffle migration script
    const constructors = {}; // for constructors for Crowdsale, Locker

    let crowdsaleConstructorArgumentLength = 0;

    let variableDeclares = ""; // JS variable declarations
    const declareTabs = 2; // tab level for declaration

    let initBody = ""; // send TXs to initialize contracts
    const funTabs = 2; // tab level for function body

    meta.projectName = input.project_name.replace(/\W/g, "");

    // BaseCrowdsale
    crowdsale.parentsList.push("BaseCrowdsale");
    crowdsale.importStatements.push("import \"./base/crowdsale/BaseCrowdsale.sol\";");
    constructors.BaseCrowdsale = defaultConstructors(input);

    // HolderBase.initHolders
    variableDeclares += `
${ writeTap(declareTabs) }const holderAddresses = get(data, "input.sale.distribution.ether").map(e => e.ether_holder);
${ writeTap(declareTabs) }const holderRatios = get(data, "input.sale.distribution.ether").map(e => e.ether_ratio);
    `;

    initBody += `
${ writeTap(funTabs) }await vault.initHolders(
${ writeTap(funTabs + 1) }holderAddresses,
${ writeTap(funTabs + 1) }holderRatios
${ writeTap(funTabs) });
`;

    // parse input.token
    if (input.token.token_type.is_minime) {
      token.parentsList.push("MiniMeToken");
      token.importStatements.push("import \"./base/minime/MiniMeToken.sol\";");

      crowdsale.parentsList.push("MiniMeBaseCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/MiniMeBaseCrowdsale.sol\";");

      constructors.MiniMeBaseCrowdsale = [["address", "address.token"]];
    } else {
      token.parentsList.push("Mintable");
      token.importStatements.push("import \"./base/zeppelin/token/Mintable.sol\";");

      crowdsale.parentsList.push("ZeppelinBaseCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/ZeppelinBaseCrowdsale.sol\";");

      constructors.ZeppelinBaseCrowdsale = [["address", "address.token"]];

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

      const timeConvertor = arrayConvertor(input.sale.rate.bonus.time_bonuses);
      const amountConvertor = arrayConvertor(input.sale.rate.bonus.amount_bonuses);

      variableDeclares += `
${ writeTap(declareTabs) }const bonusTimes = [ ${ timeConvertor("bonus_time_stage").join(", ") } ];
${ writeTap(declareTabs) }const bonusTimeValues = [ ${ timeConvertor("bonus_time_ratio").join(", ") } ];
      `;

      initBody += `
${ writeTap(funTabs) }await crowdsale.setBonusesForTimes(
${ writeTap(funTabs + 1) }bonusTimes,
${ writeTap(funTabs + 1) }bonusTimeValues
${ writeTap(funTabs) });
`;

      variableDeclares += `
${ writeTap(declareTabs) }const bonusAmounts = [ ${ amountConvertor("bonus_amount_stage", BNConvertor).join(", ") } ];
${ writeTap(declareTabs) }const bonusAmountValues = [ ${ amountConvertor("bonus_amount_ratio").join(", ") } ];
`;

      initBody += `
${ writeTap(funTabs) }await crowdsale.setBonusesForAmounts(
${ writeTap(funTabs + 1) }bonusAmounts,
${ writeTap(funTabs + 1) }bonusAmountValues
${ writeTap(funTabs) });
`;
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

    // 4. BlockIntervalCrowdsale
    if (input.sale.valid_purchase.block_interval > 0) {
      crowdsale.parentsList.push("BlockIntervalCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/BlockIntervalCrowdsale.sol\";");

      constructors.BlockIntervalCrowdsale = [["uint", "input.sale.valid_purchase.block_interval", input.sale.valid_purchase.block_interval]];
    }

    // 5. KYCCrowdsale & StagedCrowdsale
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

      variableDeclares += `
${ writeTap(declareTabs) }const periodStartTimes = [ ${ periodConvertor("start_time").join(", ") } ];
${ writeTap(declareTabs) }const periodEndTimes = [ ${ periodConvertor("end_time").join(", ") } ];
${ writeTap(declareTabs) }const periodCapRatios = [ ${ periodConvertor("cap_ratio").join(", ") } ];
${ writeTap(declareTabs) }const periodMaxPurchaseLimits = [ ${ periodConvertor("max_purchase_limit").join(", ") } ];
${ writeTap(declareTabs) }const periodMinPurchaseLimits = [ ${ periodConvertor("min_purchase_limit").join(", ") } ];
${ writeTap(declareTabs) }const periodKycs = [ ${ periodConvertor("kyc").join(", ") } ];
`;

      initBody += `
${ writeTap(funTabs) }await crowdsale.initPeriods(
${ writeTap(funTabs + 1) }periodStartTimes,
${ writeTap(funTabs + 1) }periodEndTimes,
${ writeTap(funTabs + 1) }periodCapRatios,
${ writeTap(funTabs + 1) }periodMaxPurchaseLimits,
${ writeTap(funTabs + 1) }periodMinPurchaseLimits,
${ writeTap(funTabs + 1) }periodKycs
${ writeTap(funTabs) });
`;
    }

    // Locker.lock()
    let i = 0;
    for (const { address, is_straight, release } of input.locker.beneficiaries) {
      i += 1;

      const releaseConvertor = arrayConvertor(release);

      variableDeclares += `
${ writeTap(declareTabs) }const release${ i }Times = [ ${ releaseConvertor("release_time").join(", ") } ];
${ writeTap(declareTabs) }const release${ i }Ratios = [ ${ releaseConvertor("release_ratio").join(", ") } ];
`;

      initBody += `
${ writeTap(funTabs) }await locker.lock(
${ writeTap(funTabs + 1) }${ convertAddress(address) },
${ writeTap(funTabs + 1) }${ is_straight },
${ writeTap(funTabs + 1) }release${ i }Times,
${ writeTap(funTabs + 1) }release${ i }Ratios
${ writeTap(funTabs) });
`;
    }

    // constructor for The Crowdsale
    constructors.Crowdsale = [];
    crowdsale.parentsList.forEach((parent) => {
      crowdsaleConstructorArgumentLength += constructors[ parent ].length;

      constructors.Crowdsale = [...constructors.Crowdsale, ...constructors[ parent ]];
    });

    return {
      meta,
      token,
      crowdsale,
      migration,
      constructors,
      initBody,
      variableDeclares,
      crowdsaleConstructorArgumentLength,
    };
  }
}
