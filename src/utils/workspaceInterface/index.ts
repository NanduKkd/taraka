import * as fs from 'fs';
import vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { glob } from 'glob';

export interface FileSystemItem {
  name: string;
  path: string;
  isFolder: boolean;
}

/**
  * Lists files and folders in a given path, with optional search and depth constraints.
  * @param folderPath The path to the folder to list.
  * @param search A string to filter the results by.
  * @param depth The maximum depth to search.
  * @returns A promise that resolves to an array of file system items.
  */
export async function listFiles(folderPath: string, search: string, depth: number): Promise<FileSystemItem[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceFolder) {
    return [];
  }

  const absolutePath = path.join(workspaceFolder, folderPath);
  const pattern = depth > 0 ? `${absolutePath}/**` : `${absolutePath}/**/*`;

  const files = await glob(pattern, { ignore: '**/node_modules/**', nodir: false, dot: true, maxDepth: depth > 0 ? depth : undefined });

  const items: FileSystemItem[] = files
  .filter(file => path.basename(file).includes(search))
  .map(file => {
    const stats = fs.statSync(file);
    return {
      name: path.basename(file),
      path: path.relative(workspaceFolder, file),
      isFolder: stats.isDirectory(),
    };
  });

  return items;
}

/**
  * Reads the content of a file.
  * @param filePath The path to the file to read.
  * @param startLineInclusive The line to start reading from (inclusive).
  * @param endLineExclusive The line to stop reading at (exclusive).
  * @returns A promise that resolves to the content of the file.
  */
export async function readFile(filePath: string, startLineInclusive?: number, endLineExclusive?: number): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceFolder) {
    throw new Error("No workspace folder found.");
  }
  const absolutePath = path.join(workspaceFolder, filePath);
  const content = await fs.promises.readFile(absolutePath, 'utf-8');
  if (startLineInclusive === undefined || endLineExclusive === undefined) {
    return content;
  }
  const lines = content.split('\n');
  return lines.slice(startLineInclusive, endLineExclusive).join('\n');
}

/**
  * Writes content to a file.
  * @param content The content to write.
  * @param filePath The path to the file to write to.
  * @param shouldCreateNewFile Whether to create a new file if it doesn't exist.
  */
export async function writeFile(content: string, filePath: string, shouldCreateNewFile: boolean): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceFolder) {
    throw new Error("No workspace folder found.");
  }
  const absolutePath = path.join(workspaceFolder, filePath);
  if (!shouldCreateNewFile && !fs.existsSync(absolutePath)) {
    throw new Error("File does not exist and shouldCreateNewFile is false.");
  }
  await fs.promises.writeFile(absolutePath, content);
}

/**
  * Searches for a pattern in all files in a given folder.
  * @param folderPath The path to the folder to search in.
  * @param pattern The pattern to search for.
  * @returns A promise that resolves to an array of search results.
  */
export async function grepSearch(folderPath: string, pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceFolder) {
      return reject("No workspace folder found.");
    }
    const absolutePath = path.join(workspaceFolder, folderPath);
    exec(`git grep -l "${pattern}" ${absolutePath}`, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(stderr);
      }
      resolve(stdout.split('\n').filter(line => line.length > 0));
    });
  });
}

/**
  * Runs a terminal command.
  * @param command The command to run.
  * @returns A promise that resolves to the stdout of the command.
  */
export async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(stderr);
      }
      resolve(stdout);
    });
  });
}
