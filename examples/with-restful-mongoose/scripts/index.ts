import { Command } from 'commander';
import { bootstrap as modelsBootstrap } from './models-generator';
import { bootstrap as apiBoostrap } from './api-generator';
import { bootstrap as frontendBoostrap } from './frontend-generator';
import { Project } from 'ts-morph';
import {
  createInitFile,
  formatFiles,
  IAnswer,
  propmtTechStack,
  readAvilaConfig,
} from './utils';
import inquirer from 'inquirer';

function main() {
  const program = new Command();
  const project = new Project();

  program
    .name('custom-cli')
    .description('A CLI tool to manage components')
    .version('1.0.0');

  program
    .command('resource')
    .description('Create a new component')
    .argument('<name>', 'Component name')
    .option('-o, --overwrite', 'Overwrite existing components', true)
    .option('-a, --algolia', 'Algolia integration added', false)
    .action(async (name: string, options) => {
      try {
        readAvilaConfig();
      } catch (e) {
        console.log(
          'Error: Not config file found please run `npm run g init` to create the config file'
        );
        process.exit(1);
      }
      const answers: IAnswer = await propmtTechStack();

      console.log('Creating component:', name);
      // Add the params to choose the tech stack
      await modelsBootstrap(name, project, options.overwrite);
      console.log('Model created successfully!');

      console.log('Generating API component for:', name);

      // Add the params to choose the tech stack
      await apiBoostrap(
        name,
        project,
        options.algolia,
        options.overwrite,
        answers.serverLocation
      );

      console.log('Generted API route');

      console.log('Generating frontend component for:', name);

      await frontendBoostrap({
        name,
        project,
        overwrite: options.overwrite,
        techStack: answers,
      });

      // format the files after generation
      formatFiles([
        `packages/models/src/${name}`,
        `apps/api/src/components/${name}`,
        `apps/api/src/routes.ts`,
        `apps/api/src/${answers.serverLocation}`,
        `packages/services`,
      ]);
    });

  program
    .command('init')
    .description('Initialize the project')
    .action(async () => {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter the project name to initialize the json file',
        },
      ]);

      await createInitFile(answer.projectName);
    });

  program.parse(process.argv);
}

main();
