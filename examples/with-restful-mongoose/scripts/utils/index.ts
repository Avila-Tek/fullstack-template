import * as fs from 'fs';

/**
 * @function
 * @description Creates a new folder
 * @implements file-system
 * @param {string} folderPath - The path of the folder to be created
 * @requires fs
 * @returns {void} - void
 * @since 1.0.0
 * @summary Create a new folder
 * @version 1
 */
export function createFolder(folderPath: string): void {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
}

/**
 * @function
 * @description Capitalizes the first letter of a string
 * @implements string
 * @param {string} str - The string to be converted
 * @returns {string} - Returns the string with the first letter capitalized
 * @since 1.0.0
 * @summary Capitalize the first letter of a string
 * @version 1
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export * from './file-generator';
