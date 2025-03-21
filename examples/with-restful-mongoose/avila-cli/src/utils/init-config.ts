import { IAnswer, propmtTechStack, resolvePath } from './index';
import fs from 'fs';

export default async function createInitFile() {
  const root = resolvePath();
  const answers: IAnswer = await propmtTechStack();
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
        2,
      ),
    );
  }
}
