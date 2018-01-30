export function writeTap(numTap) {
  return "  ".repeat(numTap);
}

export function getLastName(str, delimiter = ".") {
  return str.split(delimiter).slice(-1)[ 0 ];
}

/**
 * @notice flatten `args` into solidity function parameters
 * @param { array } args is form of [ [solidity data type], [path for lodash.get] ]
 */
export function flattenArguments(args, last = false, numTap = 3, withType = true) {
  const comma = i => ((!last || i < args.length - 1) ? "," : "");

  return args
    .map((typeAndPath, i) =>
      `\n${ writeTap(numTap) }${ withType ? typeAndPath[ 0 ] : "" } ${ getLastName(typeAndPath[ 1 ]) }${ comma(i) }`)
    .join("");
}

/**
 * @param { array } args is form of [ [ [solidity data type], [path for lodash.get] ] ]
 */
export function flattenArgumentsArray(args) {
  const last = i => i === args.length - 1;

  return args
    .map((a, i) => flattenArguments(a, last(i)))
    .join("      \n");
}

/**
 * @param { String } parentName parent contract name to inherit
 * @param { array } args is form of [ [solidity data type], [path for lodash.get] ]
 */
export function writeSuperModifier(parentName, args) {
  return `${ writeTap(4) }${ parentName } (${ flattenArguments(args, true, 5, false) })`;
}

/**
 * @param { array } parentsList names of parent contracts
 * @param { object } constructors set of arguments of constructors
 */
export function writeSuperModifiers(parentsList, constructors) {
  return `\n${
    parentsList
      .map(parentName => writeSuperModifier(parentName, constructors[ parentName ]))
      .join("\n")
  }`;
}
