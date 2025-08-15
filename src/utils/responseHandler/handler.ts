import { sendMessage } from '../aiApi';
import SSEParser from './SSEParser';
import SSECompiler from './SSECompiler';
import { PassThrough, Readable } from 'node:stream';
import { aiEvent, modelData, toolCall, ToolResultContentBlock, UserContentBlock } from '../../types/common';
import { executer, toolCallResponse } from '../tools/executer';
import { toolCallName } from '../tools/validations';

export default class AIHandler extends Readable {
  constructor(promptId: string, sessionId: number, text: string, model: modelData) {
    super({objectMode: true});
    this.start(promptId, sessionId, [{type: 'text', text}], model);
  }
  push(chunk: aiEvent) {
    return super.push(chunk);
  }
  destroy(error: any) {
    if(error instanceof Error)
      return super.destroy(error);
    return super.destroy(new Error("Unknown error occured"));
  }
  async start(promptId: string, sessionId: number, content: ToolResultContentBlock[] | UserContentBlock[], model: modelData) {
    console.log('starting....');
    try {
      let out: aiEvent;
      const toolCalls: toolCall[] = [];
      
      const res = await sendMessage(promptId, sessionId, content, model);
      const readable = res.pipe(new SSEParser()).pipe(new SSECompiler(promptId, sessionId));
      for await (out of readable) {
        if(out.type==='tool') {
          toolCalls.push(out.toolCallData);
        }
        this.push(out);
      }
      const toolCallResponses: ToolResultContentBlock[] = [];
      if(!toolCalls.length)
        return this.push({ type: 'end', id: promptId, sessionId });
      for(const tool of toolCalls) {
        let response: toolCallResponse;
        switch (tool.name) {
          case 'list_dir':
            response = await executer(tool as toolCall<'list_dir'>);
            break;
          case 'read_file':
            response = await executer(tool as toolCall<'read_file'>);
            break;
          case 'write_file':
            response = await executer(tool as toolCall<'write_file'>);
            break;
          case 'grep_search':
            response = await executer(tool as toolCall<'grep_search'>);
            break;
          case 'run_terminal_command':
            response = await executer(tool as toolCall<'run_terminal_command'>);
            break;
          default:
            throw new Error(`Unknown tool`);
        }
        toolCallResponses.push({type: 'tool_result', toolCallId: tool.id, toolCallName: tool.name, toolCallResponse: response});
        this.push({type: 'tool_response', toolCallId: tool.id, toolResponse: response, id: promptId, sessionId});
      }
      this.start(promptId, sessionId, toolCallResponses, model);
    } catch (error) {
      this.destroy(error);
    }
  }
  _read() {
  }
}
