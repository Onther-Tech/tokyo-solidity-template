export function serialize(json) {
  return JSON.stringify(json).replace(/"/g, "'");
}

export function writeTap(numTap) {
  return "  ".repeat(numTap);
}

export function getLastName(str, delimiter = ".") {
  return str.split(delimiter).slice(-1)[ 0 ];
}

export function appendParseFunction(type, argName, index, withType) {
  if (withType) return `${ type } ${ argName }`;
  if (type === "uint") return `parseUint(args[${ index }])`;
  if (type === "address") return `parseAddress(args[${ index }])`;
  if (type === "bool") return `parseBool(args[${ index }])`;

  throw new Error("can't recognize type", type);
}

/**
 * @notice flatten `args` into solidity function parameters
 * @param { Array } args is form of [ [solidity data type], [path for lodash.get] ]
 * @param { Number } numTap the number of tabs
 * @param { Bool } withType if true, append solidity data type. if false, remove it and use `args`
 */
export function flattenArguments(args, startIndex, numTap = 3, withType = true) {
  return args
    .map((typeAndPath, i) => {
      const type = typeAndPath[ 0 ];
      const argName = getLastName(typeAndPath[ 1 ]);
      const value = withType ? argName : appendParseFunction(type, argName, startIndex + i, withType);

      return `\n${ writeTap(numTap) }${ value }`;
    }).join(",");
}

/**
 * @param { String } parentName parent contract name to inherit
 * @param { Array } args is form of [ [solidity data type], [path for lodash.get] ]
 * @param { Number } startIndex index of arguments
 */
export function writeSuperModifier(parentName, args, startIndex) {
  return `${ writeTap(4) }${ parentName } (${ flattenArguments(args, startIndex, 5, false) })`;
}

/**
 * @param { Array } parentsList names of parent contracts
 * @param { object } constructors set of arguments of constructors
 */
export function writeSuperModifiers(parentsList, constructors) {
  const ret = [];

  let i = 0;

  parentsList.forEach((parentName) => {
    const len = constructors[ parentName ].length;

    console.log(writeSuperModifiers, parentName, i);
    ret.push(writeSuperModifier(parentName, constructors[ parentName ], i));

    i += len;
  });

  return `\n${ ret.join("\n") }`;
}
