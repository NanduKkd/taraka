import * as z from 'zod';
enum toolCallNameEnum {
  a='a', b='b'
}
export const toolCallArgValidators = z.object({
  list_dir: z.object({
    folderPath: z.string(),
    search: z.string().optional(),
  }),
  read_file: z.object({
    path: z.string(),
    startLineInclusive: z.number().optional(),
    endLineExclusive: z.number().optional(),
  }),
  write_file: z.object({
    filePath: z.string(),
    content: z.string(),
    shouldCreateNewFile: z.boolean().optional(),
  }),
  grep_search: z.object({
    dirPath: z.string(),
    search: z.string(),
  }),
  run_terminal_command: z.object({
    command: z.string(),
  }),
})

export type toolCallArgs = z.infer<typeof toolCallArgValidators>;

export type toolCallName = keyof toolCallArgs;

export type toolCall<T = toolCallName> = T extends toolCallName ? {
  id: string,
  name: T,
  args: toolCallArgs[T],
} : never

export const toolCallNameValidator = (a: string): a is toolCallName => {
  return toolCallArgValidators.keyof().safeParse(a).success;
}

export const toolCallValidator = (obj: { id: string, name: string, args: unknown }): obj is toolCall => {
  if(!toolCallNameValidator(obj.name))
    return false;
  return toolCallArgValidators.shape[obj.name].safeParse(obj.args).success;
}
