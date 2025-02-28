import path from 'path';
import fs from 'fs';
import { Project } from 'ts-morph';
import { createFolder, FileGenerator, installDependencies } from '../../utils';

export async function generateServicePackage(): Promise<void> {
  const project = new Project();
  const servicePath = path.resolve(__dirname, '../../../packages');
  const root = `${servicePath}/services`;
  const src = `${root}/src`;

  // create the services folder
  createFolder(root);
  createFolder(src);

  const fileGenerator = new FileGenerator(project, '');

  // create eslintrc.js if it doesn't exist

  const eslintFile = `${root}/.eslintrc.js`;
  if (!fs.existsSync(eslintFile)) {
    fileGenerator.setFile(eslintFile, true);
    fileGenerator.writeInNonTsFile(
      '/** @type {import("eslint").Linter.Config} */\nmodule.exports = {\n  root: true,\n  parser: "@typescript-eslint/parser",\n  parserOptions: {\n    project: true,\n  },\n};'
    );
    await fileGenerator.save();
  }

  // create the package.json and install dependencies

  const packagejson = `${root}/package.json`;
  if (!fs.existsSync(packagejson)) {
    fileGenerator.setFile(packagejson, true);
    fileGenerator.writeInNonTsFile(
      '{\n  "name": "@avila-tek/services",\n  "version": "0.0.0",\n  "private": true,\n  "exports": {\n    ".": "./src/index.ts"\n  },\n  "scripts": {\n    "lint": "eslint .",\n    "lint:fix": "eslint . --fix",\n    "dev": "tsup src/index.ts --format cjs --watch --dts"\n  },\n  "devDependencies": {\n    "@avila-tek/models": "*"\n  }\n}'
    );
    await fileGenerator.save();
  }

  // we do it this way to avoid installing typescript and eslint as peer-dependencies
  installDependencies('packages/services', [
    {
      name: '@tanstack/react-query',
      dev: true,
    },
    {
      name: 'eslint',
      dev: true,
    },
    {
      name: 'typescript',
      dev: true,
    },
  ]);

  // create the tsconfig.json and tsconfig.lint.json

  const tsconfigFile = `${root}/tsconfig.json`;
  if (!fs.existsSync(tsconfigFile)) {
    fileGenerator.setFile(tsconfigFile, true);
    fileGenerator.writeInNonTsFile(
      '{\n  "extends": "@repo/typescript-config/react-library.json",\n  "compilerOptions": {\n    "outDir": "dist"\n  },\n  "include": ["src"],\n  "exclude": ["node_modules", "dist"]\n}'
    );
    await fileGenerator.save();

    const tsconfigFileJson = `${root}/tsconfig.lint.json`;
    fileGenerator.setFile(tsconfigFileJson, true);
    fileGenerator.writeInNonTsFile(
      '{\n  "extends": "@repo/typescript-config/react-library.json",\n  "compilerOptions": {\n    "outDir": "dist"\n  },\n  "include": ["src","turbo"],\n  "exclude": ["node_modules", "dist"]\n}'
    );
    await fileGenerator.save();
  }

  // create the turbo.json file

  const turboFile = `${root}/turbo.json`;
  if (!fs.existsSync(turboFile)) {
    fileGenerator.setFile(turboFile, true);
    fileGenerator.writeInNonTsFile(
      '{\n  "$schema": "https://turbo.build/schema.json",\n  "extends": ["//"],\n  "tasks": {\n    "build": {\n      "outputs": ["dist/**"]\n    }\n  }\n}'
    );
    await fileGenerator.save();
  }
}
