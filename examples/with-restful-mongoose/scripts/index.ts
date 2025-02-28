import { Command } from 'commander';
import { bootstrap as modelsBootstrap } from './models-generator';
import { bootstrap as apiBoostrap } from './api-generator';
import { bootstrap as frontendBoostrap } from './frontend-generator';
import { Project } from 'ts-morph';
import { formatFiles, IAnswer, propmtTechStack } from './utils';

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
      ]);
    });

  program.parse(process.argv);
}

main();
