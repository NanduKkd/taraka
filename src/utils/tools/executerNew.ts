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

export async function executer(tool: toolCall<'list_dir'>): Promise<toolCallResponse<'list_dir'>>;
export async function executer(tool: toolCall<'read_file'>): Promise<toolCallResponse<'read_file'>>;
export async function executer(tool: toolCall<'write_file'>): Promise<toolCallResponse<'write_file'>>;
export async function executer(tool: toolCall<'grep_search'>): Promise<toolCallResponse<'grep_search'>>;
export async function executer(tool: toolCall<'run_terminal_command'>): Promise<toolCallResponse<'run_terminal_command'>>;
export async function executer(tool: toolCall<toolCallName>): Promise<toolCallResponse> {
  try {
    switch (tool.name) {
      case 'list_dir': {
        const out: toolCallResponse<typeof tool.name> = makeOutput({items: await listFiles(tool.args.folderPath, tool.args.search || '', 1)});
        return out;
      }
      case 'read_file': {
        const text = await readFile(tool.args.path, tool.args.startLineInclusive, tool.args.endLineExclusive);
        const out: toolCallResponse<typeof tool.name> = makeOutput({ text });
        return out;
      }
      case 'write_file': {
        await writeFile(tool.args.filePath, tool.args.content, tool.args.shouldCreateNewFile || false);
        const out: toolCallResponse<typeof tool.name> = makeOutput({ message: "File written successfully" });
        return out;
      }
      case 'grep_search': {
        const files = await grepSearch(tool.args.dirPath, tool.args.search);
        const out: toolCallResponse<typeof tool.name> = makeOutput({ files });
        return out;
      }
      case 'run_terminal_command': {
        const output = await runCommand(tool.args.command);
        const out: toolCallResponse<typeof tool.name> = makeOutput({ output });
        return out;
      }
      default:
        throw new Error(`Invalid tool provided`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run tool: Unknown error';
    return { status: 'error', error: { message } };
  }
}
