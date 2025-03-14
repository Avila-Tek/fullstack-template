import fs from 'fs';
import { exec } from 'child_process';
import inquirer from 'inquirer';
import { Project } from 'ts-morph';
import path from 'path';
export * from './file-generator';

/**
 * @function
 * @description Creates a new folder
 * @implements file-system
 * @param {string} folderPath - The path of the folder to be created
 * @requires fs
 * @returns {void} - void
 * @since 1.0.0
 * @summary Create a new folder
 * @version 1
 */
export function createFolder(folderPath: string): void {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
}

export function resolvePath(...paths: string[]): string {
  const basePath = process.cwd();
  const relativePath = !process.env.production ? '' : '../';
  return path.resolve(basePath, relativePath, ...paths);
}

/**
 * @function
 * @description Capitalizes the first letter of a string
 * @implements string
 * @param {string} str - The string to be converted
 * @returns {string} - Returns the string with the first letter capitalized
 * @since 1.0.0
 * @summary Capitalize the first letter of a string
 * @version 1
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function execCommand(command: string): void {
  exec(command, { cwd: resolvePath() }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  });
}

export function formatFiles(files: string[]): void {
  const command = `npx prettier --write ${files.join(' ')} --single-quote`;
  execCommand(command);
}

// Reading init File

export function readAvilaConfig(): IAnswer {
  const root = resolvePath();
  const jsonData = JSON.parse(
    fs.readFileSync(`${root}/avila-config.json`, 'utf-8')
  );
  return jsonData;
}

interface IServicePath {
  root: string;
  type: WebService;
  src: string;
  lib: string;
  apiFile: string;
}

export function getServicePath(webService: WebService): IServicePath | null {
  const roots: Record<WebService, string> = {
    Shared: 'packages/services',
    Admin: 'apps/admin',
    Client: 'apps/client',
  };

  const root = roots[webService];

  if (!root) return null;

  return {
    root,
    type: webService,
    src: `${root}/src${webService === 'Shared' ? '' : '/services'}`,
    lib: `${root}/src/lib`,
    apiFile: `${root}/src/lib/api${webService === 'Shared' ? '.ts' : '/api.ts'}`,
  };
}

interface IDependency {
  name: string;
  dev: boolean;
  peer?: boolean;
}

export function installDependencies(
  workspace: string,
  dependencies: IDependency[]
): void {
  const command = `npm install -S --workspace ${workspace} ${dependencies
    .map(
      (dep) =>
        `${dep.name}${dep.dev ? ' -D' : ''}${dep.peer ? ' --save-peer' : ''}`
    )
    .join(' ')}`;
  execCommand(command);
}

export function install(): void {
  execCommand('npm i');
}

export function addLocalDependency(
  path: string,
  dependency: string,
  type: 'Dev' | 'Regular'
) {
  const packageJson = JSON.parse(fs.readFileSync(path, 'utf-8'));

  if (type === 'Dev') {
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    packageJson.devDependencies[dependency] = '*';
  } else {
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    packageJson.dependencies[dependency] = '*';
  }

  fs.writeFileSync(path, JSON.stringify(packageJson, null, 2), 'utf-8');
}

// #region Tech Stack

export const architecture = ['RESTful', 'GraphQL'] as const;
export type Architecture = (typeof architecture)[number];

export const orm = ['Mongoose', 'Prisma'] as const;
export type Orm = (typeof orm)[number];

export const webService = ['Shared', 'Admin', 'Client'] as const;
export type WebService = (typeof webService)[number];

export type IAnswer = {
  project: string;
  backendArchitecture: Architecture;
  ORM: Orm;
  webService?: WebService;
  serverLocation: string;
};

export function propmtTechStack() {
  // TODO: remove webService and prompt it with every run of the script
  return inquirer.prompt([
    {
      type: 'input',
      name: 'project',
      message: 'Project name',
    },
    {
      type: 'list',
      name: 'backendArchitecture',
      message: 'Select backend architecture',
      choices: architecture,
    },
    {
      type: 'list',
      name: 'ORM',
      message: 'Select ORM',
      choices: orm,
    },
    {
      type: 'input',
      name: 'serverLocation',
      message: 'Where is your server located?',
    },
  ]);
}

export function promptWebService() {
  return inquirer.prompt([
    {
      type: 'list',
      name: 'webService',
      message: 'Where do you want the services for the frontend to be?',
      choices: webService,
    },
  ]);
}

export interface IBoostrap {
  name: string;
  project: Project;
  overwrite: boolean;
  techStack: IAnswer;
}

// #endregion
