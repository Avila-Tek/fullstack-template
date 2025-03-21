import { Project } from 'ts-morph';
import { FileGenerator, IImports } from '../utils';
import fs from 'fs';

export async function updateRootRoutes(
  fullPath: string,
  project: Project,
  component: string,
  serverName: string
) {
  const fileGenerator = new FileGenerator(project, component);
  const file = `${fullPath}/routes.ts`;
  const willAppend = fs.existsSync(file);

  function addImports(isNew: boolean, imports: IImports[]) {
    if (isNew) {
      fileGenerator.addImports([
        {
          import: ['FastifyInstance'],
          moduleSpecifier: 'fastify',
        },
        ...imports,
      ]);
    } else {
      fileGenerator.addImports(imports);
    }
  }

  // Search from namedRoutes in the avila.config.json

  if (willAppend) {
    const routesFile = fileGenerator.project.addSourceFileAtPath(file);
    fileGenerator.setFile('', false, routesFile);

    // Check if the import already exists
    const importExists = routesFile
      .getImportDeclarations()
      .some(
        (imp) =>
          imp.getModuleSpecifierValue() ===
          `./components/${component}/${component}.routes`
      );

    if (!importExists) {
      addImports(false, [
        {
          import: [`${component}Router`],
          moduleSpecifier: `./components/${component}/${component}.routes`,
        },
      ]);
    }

    // Check if the register statement already exists
    const fileText = routesFile.getFullText();
    const registerStatement = `await fastify.register(${component}Router, { prefix: '${component}' });`;

    if (!fileText.includes(registerStatement)) {
      fileGenerator.appendToExistingFunction(registerStatement, 'routes');
    }
  } else {
    // Create the file if it doesn't exist
    fileGenerator.setFile(file, false);

    addImports(true, [
      {
        import: [`${component}Router`],
        moduleSpecifier: `./components/${component}/${component}.routes`,
      },
    ]);

    fileGenerator.addFunctionDefinition({
      name: 'routes',
      isAsync: true,
      returnType: 'Promise<void>',
      parameters: [
        {
          name: 'fastify',
          type: 'FastifyInstance',
        },
      ],
      statements: [],
      isExported: true,
    });

    fileGenerator.appendToExistingFunction(
      `await fastify.register(${component}Router, { prefix: '${component}' });`,
      'routes'
    );
  }

  await updateAppFile(
    fullPath,
    project,
    serverName,
    'await <name>.register(routes);'
  );

  await fileGenerator.save();
}

export async function updateAppFile(
  fullPath: string,
  project: Project,
  serverName: string,
  statementToAdd: string
) {
  const file = `${fullPath}/${serverName}`;
  if (!fs.existsSync(file)) {
    console.error(`File ${file} not found.`);
    return;
  }

  const sourceFile = project.addSourceFileAtPath(file);

  // **1. Check if 'routes' import exists**
  const importExists = sourceFile
    .getImportDeclarations()
    .some((imp) => imp.getModuleSpecifierValue() === './routes');

  // **If import exists, exit early (no need to update anything)**
  if (importExists) {
    console.log(
      `'routes' import already exists in ${serverName}. No changes needed.`
    );
    return;
  }

  // **2. Add the 'routes' import**
  sourceFile.addImportDeclaration({
    namedImports: ['routes'],
    moduleSpecifier: './routes',
  });

  // **3. Iterate over functions and find `await <name>.ready();`**
  let updated = false;

  sourceFile.getFunctions().forEach((func) => {
    const body = func.getBody();
    if (!body) return; // Ensure it's a valid block

    const statements = body.getChildSyntaxList()?.getChildren() || [];
    statements.forEach((stmt) => {
      const text = stmt.getText();
      const match = text.match(/await\s+(\w+)\.ready\(\);/);

      if (match) {
        const appVariable = match[1]; // Extract variable name (e.g., 'app', 'server', etc.)
        const modifiedStatement = statementToAdd.replace('<name>', appVariable);
        stmt.replaceWithText(
          `// Adding routes\n\n${modifiedStatement}\n\n${text}`
        );
        updated = true;
      }
    });
  });

  if (!updated) {
    console.warn(
      `No 'await <name>.ready();' statement found inside functions in ${file}.`
    );
  }

  await sourceFile.save();
}
