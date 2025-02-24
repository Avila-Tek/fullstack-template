import { bootstrap as apiBootstrap } from './api-generator';
import { bootstrap as modelsBootstrap } from './models-generator';
import { Command } from 'commander';

function main() {
  const program = new Command();

  program
    .name('custom-cli')
    .description('A CLI tool to manage components')
    .version('1.0.0');

  program
    .command('create')
    .description('Create a new component')
    .argument('<name>', 'Component name')
    .option('-o, --overwrite', 'Overwrite existing component')
    .action(async (name: string, options) => {
      await modelsBootstrap(name, options.overwrite);
    });

  program.parse(process.argv);
}

main();
