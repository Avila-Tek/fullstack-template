import { IAnswer, propmtTechStack, resolvePath } from '../utils';
import fs from 'fs';

export async function createInitFile() {
  const root = resolvePath();
  const answers: IAnswer = await propmtTechStack();
  const jsonPath = `${root}/avila-config.json`;
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
