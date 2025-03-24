import { FileGenerator } from '../../utils';

export function createIndexFile(
  src: string,
  fileGenerator: FileGenerator,
): void {
  const indexFile = `${src}/index.ts`;
  fileGenerator.setFile(indexFile, true);
  fileGenerator.addExportDeclaration([
    {
      export: undefined,
      moduleSpecifier: `./queries`,
    },
    {
      export: undefined,
      moduleSpecifier: `./mutations`,
    },
    {
      export: undefined,
      moduleSpecifier: `./hooks`,
    },
  ]);
}
