import { IAnswer, propmtTechStack } from './index';
import path from 'path';
import fs from 'fs';

export default async function createInitFile() {
  const answers: IAnswer = await propmtTechStack();
  const root = path.resolve(__dirname, '../../');
  const jsonPath = `${root}/avila-config.json`;

  if (!fs.existsSync(jsonPath)) {
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          ...answers,
          ui: [],
        },
        null,
        2
      )
    );
  }
}

createInitFile();
