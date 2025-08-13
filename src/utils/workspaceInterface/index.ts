import * as fs from 'fs';
import vscode from 'vscode';
import { v4 } from 'uuid';
import * as path from 'path';
import { exec } from 'child_process';

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
  if(!folderPath.startsWith('/')) {

    folderPath = path.join(workspaceFolder, folderPath);
  }
  const pattern = depth > 0 ? `${folderPath}/**` : `${folderPath}/**/*`;

  const files = fs.readdirSync(folderPath);;
  // const files = await glob(pattern, { ignore: '**/node_modules/**', nodir: false, dot: true, maxDepth: depth > 0 ? depth : undefined });

  const items: FileSystemItem[] = files
  .filter(file => path.basename(file).includes(search))
  .map(file => {
    const fullName = path.join(folderPath, file);
    const stats = fs.statSync(fullName);
    return {
      name: file,
      path: fullName,
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
  const absolutePath = filePath.startsWith('/') ? filePath : path.join(workspaceFolder, filePath);
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
  * Runs a terminal command using VSCode's shell integration and returns its output.
  * @param command The command to run.
  * @param isBackground Whether to run the command in the background (resolves immediately).
  * @returns A promise that resolves to the stdout of the command, or 'Running parallely' if in background.
  */
export async function runCommand(command: string, isBackground: boolean = false): Promise<string> {
  const terminal = vscode.window.createTerminal(v4());
  let run = false;
  return new Promise((resolve, reject) => {
    const disposable = vscode.window.onDidChangeTerminalShellIntegration(async (e) => {
      if (e.terminal !== terminal || run) {
        return;
      }
      run = true;
      disposable.dispose(); // Dispose the listener once the integration is ready

      try {
        const exec = e.shellIntegration.executeCommand(command);
        if (isBackground) {
          terminal.show();
          resolve('Running parallely');
          return;
        }
        const stream = exec.read();
        let out = '';
        for await (const chunk of stream) {
          out += chunk;
        }
        // Check for exit code if available, though shellIntegration.executeCommand might not expose it directly
        // For now, we'll assume success if stream ends without error.
        // If a non-zero exit code is critical, further investigation into shellIntegration API is needed.
        terminal.dispose();
        resolve(out);
      } catch (error: any) {
        terminal.dispose();
        reject(new Error(`Failed to execute command in terminal: ${error.message}`));
      }
    });
    // Show the terminal to trigger shell integration
    terminal.show(true); // true to preserve focus
  });
}
