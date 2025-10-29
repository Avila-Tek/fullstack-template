import { Exception } from './exception';

export function generateCleanStackTrace(error: Exception | Error): string[] {
  // Condense stack trace to an array of strings (more readable)
  let stack = error.stack?.split('\n').map((line) => line.trim()) || [];

  // Remove the first line of the stack trace (it's the error message, which we already declare in title)
  stack.shift();

  // Remove project path from stack trace (makes it more readable)
  const root = process.cwd().replace('\\apps\\api', '');

  stack = stack.map((line) => {
    // Remove the "at" at the beginning of each line
    line = line.slice(3);

    // Compare case-insensitive but replace with original case
    let rootIndex = line.toLowerCase().indexOf(root.toLowerCase());

    // If root path is not found, return original line
    if (rootIndex === -1) return line;

    // Replace root path with empty string
    return line.slice(0, rootIndex) + line.slice(rootIndex + root.length);
  });

  return stack;
}
