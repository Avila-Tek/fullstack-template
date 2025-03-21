import { Command } from 'commander';
import { Project } from 'ts-morph';
import { resourceCallback } from './commands/resource';
import { createInitFile } from './commands/init';

export function main() {
  const program = new Command();
  const project = new Project();

  program
    .name('avila-cli')
    .description('A CLI Tool for generating components for Avila Tek Projects')
    .version('1.0.0');

  program
    .command('resource')
    .description('Create a new component')
    .argument('<name>', 'Component name')
    .action((name: string) => resourceCallback(name, project));

  program
    .command('init')
    .description('Initialize the project')
    .action(createInitFile);

  program.parse(process.argv);
}
