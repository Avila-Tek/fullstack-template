import { Project } from "ts-morph";
import { capitalize, FileGenerator } from "../utils";

export async function createModelFile(
  fullPath: string,
  project: Project,
  component: string,
  algolia: boolean,
  overwrite: boolean = false,
): Promise<void> {
  const fileGenerator = new FileGenerator(project, component);
  fileGenerator.setFile(`${fullPath}/${component}.model.ts`, overwrite);
  const schema = `${component}Schema`;
  fileGenerator.addImports([
    {
      moduleSpecifier: "mongoose",
      import: ["model"],
      default: false,
    },
    {
      moduleSpecifier: "@avila-tek/models",
      import: [schema],
      default: false,
    },
  ]);

  if (algolia) {
    // we will set up algolia in a certain way, creating another file and installing mongoose-algolia, but for now it is commented
  }

  const capitalized = capitalize(component);

  fileGenerator.addConstDeclaration({
    name: capitalized,
    initializer: `model('${capitalized}', ${schema});`,
  });

  await fileGenerator.save();
}
