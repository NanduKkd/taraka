import { Transform } from 'node:stream';
import { messageEvent } from '../../types/server';
import { contentEvent, toolCallName, TextContentBlock, ThinkingContentBlock } from '../../types/common';
import { toolCallNameValidator, toolCallValidator } from '../../utils/tools/validations';

type CurrentToolContentBlock = {
  type: 'tool',
  toolCallId: string,
  name: toolCallName,
  argsString: string,
}

export default class SSECompiler extends Transform {
  crntContentBlock?: TextContentBlock | ThinkingContentBlock | CurrentToolContentBlock;
  msgId: string
  sessionId: number
  constructor(promptId: string, sessionId: number, props={}) {
    super({...props, objectMode: true});
    this.msgId = promptId;
    this.sessionId = sessionId;
  }
  push(chunk: contentEvent) {
    return super.push(chunk);
  }
  _transform(msg: messageEvent, _encoding: any, callback: (e?: Error | null, data?: contentEvent | null) => void) {
    if(msg.event==='message_start') {
    } else if(msg.event==='content_block_start') {
      if(!this.msgId) {
        return callback(new Error("Received content block start but message id not defined"));
      }
      if(msg.data.type==='tool') {
        if(!toolCallNameValidator(msg.data.name))
          return callback(new Error("Invalid tool call name"));
        this.crntContentBlock = { type: 'tool', toolCallId: msg.data.toolCallId, argsString: '', name: msg.data.name };
        callback(null, { id: this.msgId, sessionId: this.sessionId, type: 'tool_start', toolCallData: { id: msg.data.toolCallId, name: msg.data.name } });
      } else {
        this.crntContentBlock = msg.data;
      }
    } else if(msg.event==='content_block_delta') {
      if(!this.msgId) {
        return callback(new Error("Received content block delta but message id not defined"));
      }
      const block = msg.data;
      if(!this.crntContentBlock) {
        return callback(new Error("Received content block delta but content block not created"));
      } else if(block.type==='text' && this.crntContentBlock.type=='text') {
        callback(null, {...this.crntContentBlock, sessionId: this.sessionId, id: this.msgId});
        this.crntContentBlock.text += block.delta;
      } else if(block.type==='thinking' && this.crntContentBlock.type=='thinking') {
        callback(null, {...this.crntContentBlock, id: this.msgId, sessionId: this.sessionId});
        this.crntContentBlock.thinking += block.delta;
      } else if(block.type==='tool' && this.crntContentBlock.type==='tool') {
        if(!this.crntContentBlock.argsString) this.crntContentBlock.argsString = '';
        this.crntContentBlock.argsString += block.delta;
      } else if(block.type==='signature' && this.crntContentBlock.type==='thinking') {
      } else {
        return callback(new Error("Mismatch in current content block type and received content block"));
      }
    } else if(msg.event==="content_block_end") {
      if(!this.msgId)
        return callback(new Error("Received content block end but content block not created"));
      if(!this.crntContentBlock)
        return callback(new Error('Content block is undefined but received content block end event'));
      if(this.crntContentBlock.type==='tool') {
        let args: unknown;
        try {
          args = JSON.parse(this.crntContentBlock.argsString);
        } catch (error) {
          return callback(new Error("Unable to parse tool call args"));
        }
        const toolCall = {
          name: this.crntContentBlock.name,
          id: this.crntContentBlock.toolCallId,
          args: args,
        }
        if(!toolCallValidator(toolCall))
          return callback(new Error("Invalid tool call args"));
        callback(null, {
          type: 'tool',
          id: this.msgId, sessionId: this.sessionId,
          toolCallData: toolCall
        });
      }
    } else if(msg.event==='message_end') {
      if(!this.msgId)
        return callback(new Error("Message end event received but id not set"));
    }
    callback();
  }
}
