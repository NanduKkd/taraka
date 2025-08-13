import { readFile, writeFile } from 'fs/promises'
import { sendCodeReplace, setAuth } from '../aiApi';


export default async function executeWrite (path: string, content: string): Promise<string> {
  let existing = '';
  try {
    existing = await readFile(path, 'utf8');
  } catch (error) {
    if(error instanceof Error && 'code' in error && error.code==='ENOENT') {}
    else {
      throw error;
    }
    // the file does not exist
  }
  const finalCode = await sendCodeReplace({ filePath: path, actualCode: existing, newCode: content });
  await writeFile(path, finalCode)
  return finalCode
}
