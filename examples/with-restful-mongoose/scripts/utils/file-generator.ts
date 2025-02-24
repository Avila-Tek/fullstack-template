import {
  ExportDeclaration,
  Project,
  SourceFile,
  VariableDeclarationKind,
} from 'ts-morph';

/**
 * @interface
 * @description The interface for the imports object
 * @property {string} import - The import name
 * @property {boolean} default - Whether the import is a default import
 * @property {string} moduleSpecifier - The module specifier for the import
 * @since 1.0.0
 * @summary Imports Interface
 * @version 1
 */
interface IImports {
  import: string[];
  default: boolean;
  moduleSpecifier: string;
  isTypeOnly?: boolean;
}

/**
 * @interface
 * @description The interface for the addConstDeclaration object
 * @property {string} name - The name of the constant
 * @property {string} initializer - The initializer for the constant
 * @property {boolean} isExported - Whether the constant is exported
 * @since 1.0.0
 * @summary Add Const Declaration Interface
 * @version 1
 */

interface IAddConstDeclaration {
  name: string;
  initializer: string;
  isExported?: boolean;
}

interface IExportDeclaration {
  export: string[];
  moduleSpecifier: string;
}

/**
 * @class
 * @description The class for the file generator
 * @property {Project} project - The project to create the file in
 * @property {string} component - The component to create the file for
 * @property {SourceFile} file - The source file to create
 *
 * @since 1.0.0
 * @summary File Generator Class
 * @version 1
 * @requires ts-morph
 * @see {@link https://ts-morph.com/setup/adding-source-files}
 * @example
 * const fileGenerator = new FileGenerator(project, component);
 * fileGenerator.setFile(`<path_to_file>.ts`, overwrite);
 */

export class FileGenerator {
  public project: Project;
  public component: string;
  private file: SourceFile;

  constructor(project: Project, component: string) {
    this.project = project;
    this.component = component;
  }

  /**
   * @function
   * @description Creates a new file
   * @implements ts-morph
   * @listens {Project}
   * @param {string} fullPath - The full path to the file
   * @param {boolean} overwrite - Whether to overwrite the file if it already exists
   * @requires ts-morph
   * @see {@link https://ts-morph.com/setup/adding-source-files}
   * @since 1.0.0
   * @summary Create a new file
   * @version 1
   */
  setFile(fullPath: string, overwrite: boolean, sourceFile?: SourceFile) {
    // It'll create the file and overwrite it if it already exists
    if (!sourceFile) {
      this.file = this.project.createSourceFile(fullPath, '', {
        overwrite,
      });
      return;
    }
    this.file = sourceFile;
  }

  get File() {
    return this.file;
  }

  /**
   * @function
   * @description Adds imports to a source file
   * @implements ts-morph
   * @listens {SourceFile}
   * @param {IImports[]} imports - The imports to add to the source file
   * @requires ts-morph
   * @returns {void}
   * @see {@link https://ts-morph.com/details/imports}
   * @since 1.0.0
   * @summary Add imports to a source file
   * @version 1
   */

  public addImports(imports: IImports[]): void {
    imports.forEach((imp) => {
      this.file.addImportDeclaration({
        moduleSpecifier: imp.moduleSpecifier,
        namedImports: imp.import,
        defaultImport: imp.default ? imp.import[0] : undefined,
        isTypeOnly: imp.isTypeOnly,
      });
    });
  }

  /**
   * @function
   * @description Adds an export declaration to the source file
   * @implements ts-morph
   * @listens {SourceFile}
   * @param {IExportDeclaration[]} exports - The export declarations to add
   * @requires ts-morph
   * @returns {void}
   * @since 1.0.0
   * @summary Add an export declaration to the source file
   * @version 1
   */

  public addExportDeclaration(exports: IExportDeclaration[]): void {
    exports.forEach((exp) => {
      this.file.addExportDeclaration({
        namedExports: exp.export,
        moduleSpecifier: exp.moduleSpecifier,
      });
    });
  }

  /**
   * @function
   * @description Gets an export declaration from the source file
   * @implements ts-morph
   * @listens {SourceFile}
   * @param {string} moduleSpecifier - The module specifier for the export declaration
   * @requires ts-morph
   * @returns {ExportDeclaration | undefined} - The export declaration
   * @since 1.0.0
   * @summary Get an export declaration from the source file
   * @version 1
   */

  public getExportDeclaration(
    moduleSpecifier: string
  ): ExportDeclaration | undefined {
    return this.file.getExportDeclaration(moduleSpecifier);
  }

  /**
   * @function
   * @description Adds a constant declaration to the source file
   * @implements ts-morph
   * @listens {SourceFile}
   * @param {IAddConstDeclaration} param0 - The constant declaration to add
   * @requires ts-morph
   * @returns {void}
   * @since 1.0.0
   * @summary Add a constant declaration to the source file
   * @version 1
   */

  public addConstDeclaration({
    name,
    initializer,
    isExported = true,
  }: IAddConstDeclaration): void {
    this.file.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name,
          initializer,
        },
      ],
      isExported,
    });
  }

  /**
   * @function
   * @description Adds a type definition to the source file
   * @implements ts-morph
   * @listens {SourceFile}
   * @param {string} name - The name of the type
   * @param {string} type - The type definition
   * @requires ts-morph
   * @returns {void}
   * @since 1.0.0
   * @summary Add a type definition to the source file
   * @version 1
   */

  public addTypeDefinition({
    name,
    type,
    isExported = true,
  }: {
    name: string;
    type: string;
    isExported?: boolean;
  }): void {
    this.file.addTypeAlias({
      name,
      type,
      isExported,
    });
  }

  /**
   * @async
   * @function
   * @description Saves the file
   * @implements ts-morph
   * @listens {SourceFile}
   * @requires ts-morph
   * @returns {Promise<void>}
   * @since 1.0.0
   * @summary Save the file
   * @version 1
   *
   */
  public async save(): Promise<void> {
    await this.file.save();
  }
}
