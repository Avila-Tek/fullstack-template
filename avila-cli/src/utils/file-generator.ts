import {
  ArrowFunction,
  Block,
  ExportDeclaration,
  FunctionDeclaration,
  JSDocStructure,
  OptionalKind,
  ParameterDeclarationStructure,
  Project,
  SourceFile,
  StatementStructures,
  VariableDeclarationKind,
  WriterFunction,
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
export interface IImports {
  import: string[];
  default?: boolean;
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
  export: string[] | undefined;
  moduleSpecifier: string;
}

interface IFunctionDeclaration {
  name: string;
  statements:
    | string
    | WriterFunction
    | (string | WriterFunction | StatementStructures)[];
  isDefaultExport?: boolean;
  isExported?: boolean;
  parameters: OptionalKind<ParameterDeclarationStructure>[];
  returnType?: string;
  isAsync: boolean;
  docs?: OptionalKind<JSDocStructure>[];
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
  private file!: SourceFile;

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
  setFile(
    fullPath: string,
    overwrite: boolean | undefined,
    sourceFile?: SourceFile
  ) {
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
      const isDefault = imp?.default ?? false;
      this.file.addImportDeclaration({
        moduleSpecifier: imp.moduleSpecifier,
        ...(isDefault
          ? {
              defaultImport: imp.import[0],
            }
          : {
              namedImports: imp.import,
              defaultImport: undefined,
            }),
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
   * @description Adds a function definition to the source file
   * @listens {SourceFile}
   * @param {IFunctionDeclaration} param0 - The function definition to add
   * @requires ts-morph
   * @returns {void}
   * @see {@link https://ts-morph.com/details/functions}
   * @since 1.0.0
   * @summary Add a function definition to the source file
   * @version 1
   */

  public addFunctionDefinition({
    isDefaultExport = false,
    isExported = false,
    name,
    parameters,
    returnType,
    statements,
    docs,
    isAsync,
  }: IFunctionDeclaration): void {
    this.file.addFunction({
      isExported,
      isDefaultExport,
      name,
      parameters,
      returnType,
      statements,
      docs,
      isAsync,
    });
  }

  /**
   * @async
   * @function
   * @description Appends new statements to a function
   * @param {string | WritterFunction | StatementStructures[]} statements The statements to be added to the function
   * @param {string} functionName - Name of the function to look for.
   * @param {boolean} generateFuncionOnError - Generates the function if it is not found
   * @param {boolean} generateFuncionOnError - Whether to generate the function if it is not found
   * @implements ts-morph
   * @listens {SourceFile}
   * @requires ts-morph
   * @returns {void} - Nothing
   * @since 1.0.0
   * @summary Adds new statements to a function
   * @version
   */

  public appendToExistingFunction(
    statements: string | WriterFunction | StatementStructures[],
    functionName: string,
    generateFuncionOnError: boolean = false,
    parameters: OptionalKind<ParameterDeclarationStructure>[] = []
  ): void {
    const _function = this.findFunction(functionName);

    if (!_function) {
      if (generateFuncionOnError) {
        this.addFunctionDefinition({
          isExported: true,
          name: functionName,
          statements: statements,
          returnType: '',
          parameters,
          isAsync: true,
        });
      } else {
        throw new Error('Function not Found!');
      }
    }
    // Append statements depending on whether it's a regular function or an arrow function
    if (_function instanceof FunctionDeclaration) {
      _function.addStatements(statements);
    } else if (_function instanceof ArrowFunction) {
      // For arrow functions, you can append the statements differently, based on how you want to structure it
      const body = _function.getBody();
      if (body && body instanceof Block) {
        body.addStatements(statements); // Adding statements to the block of the arrow function
      }
    }
  }

  private findFunction(
    functionName: string
  ): FunctionDeclaration | ArrowFunction | undefined {
    const sourceFile = this.file; // assuming this.file is a SourceFile object

    // First, try to find a regular function declaration
    let _function: any = sourceFile.getFunction(functionName);

    if (!_function) {
      // If it's not a regular function, try to find an arrow function (including async arrow functions)
      const arrowFunction = sourceFile
        .getFunctions()
        .find(
          (func) =>
            func.getName() === functionName && func instanceof ArrowFunction
        );

      // Check if the function is an assignment to a variable
      if (!arrowFunction) {
        const variableDeclaration =
          sourceFile.getVariableDeclaration(functionName);
        if (variableDeclaration) {
          // Check if the variable is an arrow function
          const initializer = variableDeclaration.getInitializer();
          if (initializer && initializer instanceof ArrowFunction) {
            _function = initializer;
          }
        }
      } else {
        _function = arrowFunction;
      }
    }

    return _function;
  }

  /**
   * @function
   * @description Writes to a non-ts file
   * @param {string} content - The content to write to the file
   * @requires ts-morph
   * @returns {void}
   * @since 1.0.0
   * @summary Write to a non-ts file
   * @version 1
   */
  public writeInNonTsFile(content: string): void {
    this.file.insertText(0, content);
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

  public appendExportDeclaration(indexPath: string, component: string) {
    this.project.addSourceFileAtPath(indexPath);
    this.setFile('', undefined, this.project.getSourceFileOrThrow(indexPath));
    const hasAlreadyBeenExported = this.getExportDeclaration(`./${component}`);
    if (!hasAlreadyBeenExported) {
      this.addExportDeclaration([
        {
          export: undefined,
          moduleSpecifier: `./${component}`,
        },
      ]);
    }
  }
}
