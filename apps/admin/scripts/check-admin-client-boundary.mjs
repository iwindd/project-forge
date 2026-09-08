import path from "node:path";
import process from "node:process";
import ts from "typescript";

const projectRoot = process.cwd();
const scanRoots = ["src/"].map((root) => path.resolve(projectRoot, root));

function isInScanRoot(fileName) {
  const absoluteFileName = path.resolve(fileName);

  return scanRoots.some(
    (root) =>
      absoluteFileName === root ||
      absoluteFileName.startsWith(`${root}${path.sep}`),
  );
}

/*
 * Next.js supplies the props of the `error` / `global-error` boundaries itself
 * (`error`, `retry`, `reset`). Those names are fixed by the framework and are not
 * callbacks we hand across a client boundary, so the naming rule does not apply.
 */
const FRAMEWORK_ERROR_BOUNDARIES = new Set(["error", "global-error"]);

function isFrameworkErrorBoundary(fileName) {
  return FRAMEWORK_ERROR_BOUNDARIES.has(
    path.basename(fileName, path.extname(fileName)),
  );
}

function isUseClientEntry(sourceFile) {
  const firstStatement = sourceFile.statements[0];

  return Boolean(
    firstStatement &&
    ts.isExpressionStatement(firstStatement) &&
    ts.isStringLiteral(firstStatement.expression) &&
    firstStatement.expression.text === "use client",
  );
}

function isExported(node) {
  return node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
}

function getExportedComponentFunctions(sourceFile) {
  const functions = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
      functions.push(statement);
      continue;
    }

    if (!ts.isVariableStatement(statement) || !isExported(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        declaration.initializer &&
        (ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer))
      ) {
        functions.push(declaration.initializer);
      }
    }
  }

  return functions;
}

function isFunctionType(type, checker) {
  return checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;
}

function getDeclarationName(declaration) {
  return "name" in declaration && declaration.name
    ? declaration.name
    : declaration;
}

function findInvalidProps(sourceFile, component, checker) {
  const parameter = component.parameters[0];

  if (!parameter) {
    return [];
  }

  const propsType = checker.getTypeAtLocation(parameter);
  const findings = [];

  for (const property of propsType.getProperties()) {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];

    if (!declaration) {
      continue;
    }

    const propertyType = checker.getTypeOfSymbolAtLocation(
      property,
      declaration,
    );

    if (
      !isFunctionType(propertyType, checker) ||
      property.name === "action" ||
      property.name.endsWith("Action")
    ) {
      continue;
    }

    const name = getDeclarationName(declaration);
    const position = sourceFile.getLineAndCharacterOfPosition(
      name.getStart(sourceFile),
    );

    findings.push({
      file: path
        .relative(projectRoot, sourceFile.fileName)
        .replaceAll(path.sep, "/"),
      line: position.line + 1,
      column: position.character + 1,
      propName: property.name,
    });
  }

  return findings;
}

const configPath = ts.findConfigFile(
  projectRoot,
  ts.sys.fileExists,
  "tsconfig.json",
);

if (!configPath) {
  console.error("Could not find tsconfig.json.");
  process.exit(2);
}

const config = ts.readConfigFile(configPath, ts.sys.readFile);

if (config.error) {
  console.error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
  process.exit(2);
}

const parsedConfig = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  path.dirname(configPath),
);
const program = ts.createProgram({
  rootNames: parsedConfig.fileNames,
  options: parsedConfig.options,
});
const checker = program.getTypeChecker();
const findings = [];

for (const sourceFile of program.getSourceFiles()) {
  if (
    !isInScanRoot(sourceFile.fileName) ||
    isFrameworkErrorBoundary(sourceFile.fileName) ||
    !isUseClientEntry(sourceFile)
  ) {
    continue;
  }

  for (const component of getExportedComponentFunctions(sourceFile)) {
    findings.push(...findInvalidProps(sourceFile, component, checker));
  }
}

if (findings.length === 0) {
  console.log("Admin client-boundary prop scan passed.");
  process.exit(0);
}

console.error(
  "Invalid function props found in admin client-boundary components:",
);

for (const finding of findings) {
  console.error(
    `- ${finding.file}:${finding.line}:${finding.column} "${finding.propName}" must be named "action" or end with "Action"`,
  );
}

process.exit(1);
