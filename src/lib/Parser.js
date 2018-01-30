// common constructor parameters for ZeppelinBaseCrowdsale & MiniMeBaseCrowdsale
// [ [solidity data type], [path for lodash.get] ]
const defaultConstructors = () => [
  ["uint", "input.sale.start_time"],
  ["uint", "input.sale.end_time"],
  ["uint", "input.sale.rate.base_rate"],
  ["uint", "input.sale.coeff"],
  ["uint", "input.sale.max_cap"],
  ["uint", "input.sale.min_cap"],
  ["address", "address.vault"],
  ["address", "input.sale.new_token_owner"],
  ["address", "address.token"],
];

const setDefaultCrowdsaleParent = ({ crowdsale, constructors }) => {
  crowdsale.parentsList.push("BaseCrowdsale");
  crowdsale.importStatements.push("import \"./base/crowdsale/BaseCrowdsale.sol\";");

  constructors.BaseCrowdsale = defaultConstructors();
};

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
    const f = () => ({
      parentsList: [], // super contract name
      importStatements: [], // path to import suprt contract
    });

    const token = f(); // for token contract
    const crowdsale = f(); // for crowdsale contract
    const migration = f(); // for truffle migration script
    const constructors = {}; // for crowdsale constructor

    setDefaultCrowdsaleParent({ crowdsale, constructors });

    const input = this.input;

    // parse input.token
    if (input.token.token_type.is_minime) {
      token.parentsList.push("MiniMeToken");
      token.importStatements.push("import \"./base/minime/MiniMeToken.sol\";");
    } else {
      token.parentsList.push("Mintable");
      token.importStatements.push("import \"./base/zeppelin/token/Mintable.sol\";");

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

      constructors.BonusCrowdsale = [["uint", "input.sale.rate.bonus_coeff"]];
    }

    // 2. PurchaseLimitedCrowdsale
    if (input.sale.valid_purchase.max_purchase_limit.gt(0)) {
      crowdsale.parentsList.push("PurchaseLimitedCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/PurchaseLimitedCrowdsale.sol\";");

      constructors.PurchaseLimitedCrowdsale = [["uint", "input.sale.valid_purchase.max_purchase_limit"]];
    }

    // 3. MinimumPaymentCrowdsale
    if (input.sale.valid_purchase.min_purchase_limit.gt(0)) {
      crowdsale.parentsList.push("MinimumPaymentCrowdsale");
      crowdsale.importStatements.push("import \"./base/crowdsale/MinimumPaymentCrowdsale.sol\";");

      constructors.MinimumPaymentCrowdsale = [["uint", "input.sale.valid_purchase.min_purchase_limit"]];
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

      constructors.StagedCrowdsale = [["uint", "input.sale.stages_length"]]; // *_length => *.length
    }

    // constructor for The Crowdsale
    constructors.Crowdsale = [];
    crowdsale.parentsList.forEach((parent) => {
      constructors.Crowdsale = [...constructors.Crowdsale, ...constructors[ parent ]];
    });

    return { token, crowdsale, migration, constructors };
  }
}
