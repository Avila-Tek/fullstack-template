import inquirer from 'inquirer';
import { Command } from 'commander';
import { bootstrap as modelsBootstrap } from './models-generator';
import { bootstrap as apiGenerator } from './api-generator';
import { Project } from 'ts-morph';
import { formatFiles } from './utils';

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
      const answers = await inquirer.prompt([
        // {
        //   type: 'list',
        //   name: 'backendArchitecture',
        //   message: 'Select backend architecture',
        //   choices: ['RESTful', 'GraphQL'],
        // },
        // {
        //   type: 'list',
        //   name: 'ORM',
        //   message: 'Select ORM',
        //   choices: ['Mongoose', 'Prisma'],
        // },
        // {
        //   type: 'list',
        //   name: 'overwrite',
        //   message: 'Do you want to overwrite the existing component?',
        //   choices: ['Yes', 'No'],
        // },
        // {
        //   type: 'list',
        //   name: 'algolia',
        //   message: 'Do you want to enable Algolia?',
        //   choices: ['Yes', 'No'],
        // },
        // {
        //   type: 'list',
        //   name: 'shared',
        //   message: 'Where do you want the services for the frontend to be?',
        //   choices: ['Admin', 'Client', 'Both'],
        // },
        {
          type: 'list',
          name: 'serverLocation',
          message: 'Where is your server located?',
          choices: ['app.ts', 'server.ts'],
        },
      ]);

      console.log('Creating component:', name);
      await modelsBootstrap(name, project, options.overwrite);
      console.log('Model created successfully!');

      console.log('Generating API component for:', name);

      await apiGenerator(
        name,
        project,
        options.algolia,
        options.overwrite,
        answers.serverLocation
      );

      console.log('Generted API route');

      // format the files after generation
      formatFiles([
        `packages/models/src/${name}`,
        `apps/api/src/components/${name}`,
        `apps/api/src/routes.ts`,
        `apps/api/src/${answers.serverLocation}`,
      ]);
    });

  program.parse(process.argv);
}

main();
