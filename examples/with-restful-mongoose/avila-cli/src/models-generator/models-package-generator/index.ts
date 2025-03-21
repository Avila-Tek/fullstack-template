import fs from 'fs';
import { Project } from 'ts-morph';
import {
  createFolder,
  FileGenerator,
  installDependencies,
  readAvilaConfig,
  resolvePath,
} from '../../utils';

export async function generateModelsPackage(): Promise<void> {
  const servicePath = resolvePath('packages');
  const root = `${servicePath}/models`;

  // if the folder already exists, we don't overwrite it and we return
  if (fs.existsSync(root)) {
    return;
  }

  const src = `${root}/src`;

  // create the services folder
  createFolder(root);
  createFolder(src);

  // get ProjectName
  const { project: packageName } = readAvilaConfig();

  const project = new Project();
  const fileGenerator = new FileGenerator(project, '');

  // create eslintignore if it doesn't exist

  const eslintIgnoreFile = `${root}/.eslintignore`;

  if (!fs.existsSync(eslintIgnoreFile)) {
    fileGenerator.setFile(eslintIgnoreFile, true);
    fileGenerator.writeInNonTsFile('/dist\n/.turbo');
  }

  // create eslintrc.js if it doesn't exist

  const eslintFile = `${root}/.eslintrc.js`;
  if (!fs.existsSync(eslintFile)) {
    fileGenerator.setFile(eslintFile, true);
    fileGenerator.writeInNonTsFile(
      "module.exports = {\n  root: true,\n  extends: ['custom'],\n  rules: {\n    '@typescript-eslint/require-await': 'off',\n    'import/no-cycle': 'off',\n  },\n};",
    );
  }

  // create the package.json and install dependencies

  const packagejson = `${root}/package.json`;
  if (!fs.existsSync(packagejson)) {
    fileGenerator.setFile(packagejson, true);
    fileGenerator.writeInNonTsFile(
      `{\n  "name": "@${packageName}/models",\n  "version": "1.0.0",\n  "descriptions":"Models for Avila Tek projects",\n  "private": true,\n  "scripts": {\n    "lint": "eslint .",\n    "build": "tsup src/index.ts",\n    "dev": "tsup src/index.ts --format cjs --watch --dts"\n,    "format": "prettier --write ."  },\n  "files": [\n    "dist/**"\n  ],\n  "repository": {\n    "type": "git",\n    "url": "none"\n  },\n  "main": "./dist/index.js",\n  "module": "./src/index.mjs",\n  "types": "./src/index.d.ts",\n  "keywords": [],\n  "author": "Avila Tek"\n}`,
    );
  }

  // we do it this way to avoid installing typescript and eslint as peer-dependencies
  installDependencies(`packages/models`, [
    {
      name: '@types/node',
      dev: true,
    },
    {
      name: 'tsup',
      dev: true,
    },
    {
      name: 'typescript',
      dev: true,
    },
    {
      name: 'zod',
      dev: true,
    },
  ]);

  // create the tsconfig.json and tsconfig.lint.json

  const tsconfigFile = `${root}/tsconfig.json`;
  if (!fs.existsSync(tsconfigFile)) {
    fileGenerator.setFile(tsconfigFile, true);
    fileGenerator.writeInNonTsFile(
      '{\n  "compilerOptions": {\n    "moduleResolution": "Node",\n    "module": "CommonJS",\n    "outDir": "./dist",\n    "baseUrl": ".",\n  },\n  "include": ["src/**/*.ts", "tests/**/*.ts", "tsup.config.ts"],\n  "exclude": ["./dist/**", "node_modules"]\n}',
    );
  }

  // create the tsup.config.ts

  const tsupConfigFile = `${root}/tsup.config.ts`;

  fileGenerator.setFile(tsupConfigFile, true);
  fileGenerator.addImports([
    {
      moduleSpecifier: 'tsup',
      import: ['defineConfig'],
    },
  ]);

  fileGenerator.File.addExportAssignment({
    expression: `defineConfig({entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  splitting: false,
  clean: true,
  sourcemap: true,
  target: 'node18',
  shims: true,
  bundle: true,
  skipNodeModulesBundle: true,})`,
    isExportEquals: false,
  });

  // create the basicDefinitions.ts file

  const basicDefinitions = `${src}/basicDefinitions.ts`;

  fileGenerator.setFile(basicDefinitions, true);
  fileGenerator.addImports([
    {
      moduleSpecifier: 'zod',
      import: ['z'],
    },
    // ! Change this depending on the orm
    {
      moduleSpecifier: 'mongoose',
      import: ['Types'],
    },
  ]);

  fileGenerator.addConstDeclaration({
    name: 'basicDefinition',
    initializer: `z.object({
        _id: z.instanceof(Types.ObjectId).optional(),
        createdAt: z.string().datetime().or(z.date()).nullable().optional(),
        updatedAt: z.string().datetime().or(z.date()).nullable().optional(),
    })`,
  });

  fileGenerator.addConstDeclaration({
    name: 'basicModelDefinition',
    initializer: `basicDefinition.extend({
        active: z.boolean().optional(),
    })`,
  });

  fileGenerator.addConstDeclaration({
    name: 'paginateParams',
    initializer: `z.object({
        page: z.number(),
        perPage: z.number(),
    })`,
  });

  fileGenerator.addTypeDefinition({
    name: 'TPaginateParams',
    type: 'z.infer<typeof paginateParams>',
  });

  fileGenerator.addTypeDefinition({
    name: 'Pagination<T>',
    type: `{
            count: number;
            items: T[];
            pageInfo: {
                currentPage: number;
                perPage: number;
                itemCount: number;
                pageCount: number;
                hasPreviousPage: boolean;
                hasNextPage: boolean;
            };
        }`,
  });

  // create the index.ts file

  const indexFile = `${src}/index.ts`;

  fileGenerator.setFile(indexFile, true);

  fileGenerator.addExportDeclaration([
    {
      moduleSpecifier: './basicDefinitions',
      export: undefined,
    },
  ]);

  await project.save();
}
