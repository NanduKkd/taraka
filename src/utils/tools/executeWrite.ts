import { readFile, writeFile } from 'fs/promises'
import { sendCodeReplace } from '../aiApi';
import vscode from 'vscode';
import path from 'path';


export default async function executeWrite (filePath: string, content: string): Promise<string> {
  let existing = '';
  if(!filePath.startsWith('/')) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if(!workspaceFolder)
      throw new Error("No workspace selected");
    filePath = path.join(workspaceFolder, filePath);
  }
  try {
    existing = await readFile(filePath, 'utf8');
  } catch (error) {
    if(error instanceof Error && 'code' in error && error.code==='ENOENT') {}
    else {
      throw error;
    }
    // the file does not exist
  }
  const finalCode = await sendCodeReplace({ filePath: filePath, actualCode: existing, newCode: content });
  await writeFile(filePath, finalCode)
  return finalCode
}
