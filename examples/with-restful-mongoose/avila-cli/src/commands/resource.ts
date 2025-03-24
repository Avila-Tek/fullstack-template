import { Project } from 'ts-morph';
import {
  formatFiles,
  IAnswer,
  install,
  promptApi,
  promptWebService,
  readAvilaConfig,
} from '../utils';
import { bootstrap as modelsBootstrap } from '../models-generator';
import { bootstrap as apiBoostrap } from '../api-generator';
import { bootstrap as frontendBoostrap } from '../frontend-generator';

export async function resourceCallback(name: string, project: Project) {
  let answers: IAnswer;

  try {
    answers = readAvilaConfig();
  } catch (e) {
    console.log(
      'Error: Not config file found please run `avila init` to create the config file'
    );
    process.exit(1);
  }
  console.log('Creating component:', name);
  // Add the params to choose the tech stack
  await modelsBootstrap(name, project, true);
  console.log('Model created successfully!');

  console.log('Generating API component for:', name);

  // Add the params to choose the tech stack

  const { isProtected } = await promptApi();

  await apiBoostrap({
    name,
    project,
    overwrite: true,
    techStack: answers,
    isProtected,
  });

  console.log('Generted API route');

  console.log('Generating frontend component for:', name);

  // TODO: Add the param to choose the webService
  const { webService } = await promptWebService();

  await frontendBoostrap({
    name,
    project,
    overwrite: true,
    techStack: {
      ...answers,
      webService,
    },
  });

  install();

  // format the files after generation
  formatFiles([
    `packages/models/src/${name}`,
    `packages/services`,
    `apps/${answers.apps.api}/src/components/${name}`,
    `apps/${answers.apps.api}/src/routes.ts`,
    `apps/${answers.apps.api}/src/${answers.serverLocation}`,
    `apps/${answers.apps.client}`,
    `apps/${answers.apps.admin}`,
  ]);
}
