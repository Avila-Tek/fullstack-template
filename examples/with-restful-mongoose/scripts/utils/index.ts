import * as fs from 'fs';
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

export function formatFiles(files: string[]): void {
  const command = `npx prettier --write ${files.join(' ')} --single-quote`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Prettier stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}

// Reading init File

export function readAvilaConfig(): IAnswer {
  const root = path.resolve(__dirname, '../../');
  const jsonData = JSON.parse(
    fs.readFileSync(`${root}/avila-config.json`, 'utf-8')
  );
  return jsonData;
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

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Install Dependencies stderr: ${stderr}`);
      return;
    }
  });
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
  webService: WebService;
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
      type: 'list',
      name: 'webService',
      message: 'Where do you want the services for the frontend to be?',
      choices: webService,
    },
    {
      type: 'input',
      name: 'serverLocation',
      message: 'Where is your server located?',
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
