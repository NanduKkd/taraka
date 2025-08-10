import { toolCall, toolCallName } from './validations';
import { listFiles, FileSystemItem, writeFile, readFile, grepSearch, runCommand } from '../workspaceInterface';

type toolResponse<
  T1,
  T2 extends { message: string } = { message: string },
> = 
  | {status: 'success', data: T1}
  | {status: 'failed', reason: T2}
  | {status: 'error', error: { message: string }};

export type toolCallResponse<T = toolCallName> = 
  T extends 'list_dir'
    ? toolResponse<{
      items: FileSystemItem[]
    }> : T extends 'read_file'
      ? toolResponse<{
        text: string
      }> : T extends 'write_file'
        ? toolResponse<{
          message: string
        }> : T extends 'grep_search'
          ? toolResponse<{
            files: string[]
          }> : T extends 'run_terminal_command'
            ? toolResponse<{
              output: string
            }> : never;

const makeOutput = <T>(data: T): { status: 'success', data: T } => ({ status: 'success', data });

export async function executer<T extends toolCallName, R extends toolCallResponse<T>>(tool: toolCall<T>): Promise<R> {
  try {
    if(tool.name==='list_dir') {
      const out: toolCallResponse<'list_dir'> = makeOutput({ items: await listFiles(tool.args.folderPath, tool.args.search || '', 1) });
      return out as R;
    } else if(tool.name==='read_file') {
      const out: toolCallResponse<'read_file'> = makeOutput({ text: await readFile(tool.args.path, tool.args.startLineInclusive, tool.args.endLineExclusive) });
      return out as R;
    } else if(tool.name==='write_file') {
      await writeFile(tool.args.filePath, tool.args.content, tool.args.shouldCreateNewFile || false)
      const out: toolCallResponse<'write_file'> = makeOutput({ message: "File written successfully" });
      return out as R;
    } else if(tool.name==='grep_search') {
      const out: toolCallResponse<'grep_search'> = makeOutput({ files: await grepSearch(tool.args.dirPath, tool.args.search) });
      return out as R;
    } else if(tool.name==='run_terminal_command') {
      const out: toolCallResponse<'run_terminal_command'> = makeOutput({ output: await runCommand(tool.args.command) });
      return out as R;
    } else {
      throw new Error("Failed");
    }
  } catch (error) {
    return { status: 'error', error: { message: error instanceof Error ? error.message : 'Failed to run tool: Unknown error' } } as R;
  }
}
