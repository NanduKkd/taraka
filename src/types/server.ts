import { modelInfo, AssistantContentBlock } from './common';

export type MessageMetadata = {
  id: string
  session_id: number
  created_at: Date
  modelInfo: modelInfo
}

type startMessageEvent = {
  event: 'message_start'
  data: {messageMetadata: MessageMetadata},
}
type startContentBlockEvent = {
  event: 'content_block_start',
  data: AssistantContentBlock,
}
type contentBlockDeltaTypes = 'thinking' | 'text' | 'tool' | 'signature';
type deltaContentBlockEvent = {
  event: 'content_block_delta',
  data: { type: contentBlockDeltaTypes, delta: string },
}
type endContentBlockEvent = {
  event: 'content_block_end',
  data: { type: contentBlockDeltaTypes },
}
type endMessageEvent = {
  event: 'message_end',
  data: Record<string, never>,
}
type errorMessageEvent = {
  event: 'error',
  data: { message: string },
}
export type messageEvent = startMessageEvent
  | startContentBlockEvent
  | deltaContentBlockEvent
  | endContentBlockEvent
  | endMessageEvent
  | errorMessageEvent;
