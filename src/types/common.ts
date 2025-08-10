import { toolCallName, toolCall } from '../utils/tools/validations';
import { toolCallResponse } from '../utils/tools/executer';

export type modelData = 'googleai gemini-2.5-pro' | 'googleai gemini-2.5-flash' | 'googleai gemini-2.5-flash-lite'
	| 'openai gpt-5' | 'openai gpt-4.1' | 'openai gpt-4.1-nano' | 'openai gpt-4.1-mini' | 'openai o4-mini'
	| 'anthropic claude-sonnet-4' | 'anthropic claude-3.5-haiku';

export { toolCallName, toolCall };

export type textApiUpdate = {id: string, sessionId: number, type: 'text', text: string};
export type thinkingApiUpdate = {id: string, sessionId: number, type: 'thinking', thinking: string};
export type toolCallStartApiUpdate = {id: string, sessionId: number, type: 'tool_start', toolCallData: Omit<toolCall, 'args'>};
export type toolCallApiUpdate = {id: string, sessionId: number, type: 'tool', toolCallData: toolCall};

export type contentEvent = textApiUpdate | thinkingApiUpdate | toolCallStartApiUpdate | toolCallApiUpdate
export type aiEvent = contentEvent | { id: string, sessionId: number, type: 'tool_response', toolResponse: toolCallResponse } | { type: 'end', id: string, sessionId: number };


export type openaiModel = 'o4-mini' | 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano';
export type googleaiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';
export type anthropicModel = 'claude-sonnet-4' | 'claude-4-haiku';
export type model = openaiModel | googleaiModel | anthropicModel;
export type googleaiModelInfo = {
  model: googleaiModel,
  provider: 'googleai'
}
export type openaiModelInfo = {
  model: openaiModel,
  provider: 'openai'
}
export type anthropicModelInfo = {
  model: anthropicModel,
  provider: 'anthropic'
}
export type modelInfo = googleaiModelInfo | openaiModelInfo | anthropicModelInfo;

export type tokenUsage = {
  promptTokens?: number,
  cachedTokens?: number,
  completionTokens?: number,
  thinkingTokens?: number,
}

export type ToolContentBlock = {
  type: 'tool',
  toolCallId: string,
  args: object,
  name: string
}
export type ToolResultContentBlock = {
  type: 'tool_result',
  toolCallId: string,
  toolCallName: string,
  toolCallResponse: Record<string, any>,
}
export type ThinkingContentBlock = {
  type: 'thinking',
  thinking: string,
  signature?: string
}
export type TextContentBlock = {
  type: 'text',
  text: string
}
export type UserContentBlock = TextContentBlock;
export type AssistantContentBlock = ThinkingContentBlock | TextContentBlock | ToolContentBlock;
export type ContentBlock = UserContentBlock | AssistantContentBlock | ToolResultContentBlock;

export interface AssistantMessage {
  id: string,
  session_id: number,
  created_at: Date,
  content: AssistantContentBlock[],
  token_usage: tokenUsage,
  role: 'assistant',
  modelInfo: modelInfo
}
export interface UserMessage {
  id: string,
  session_id: number,
  created_at: Date,
  content: UserContentBlock[],
  role: 'user',
  modelInfo: modelInfo
}
export interface ToolResponse {
  id: string,
  session_id: number,
  created_at: Date,
  content: ToolResultContentBlock[],
  role: 'tool',
  modelInfo: modelInfo
}
export type Message = UserMessage | AssistantMessage | ToolResponse;





export type Session = {
  id: string,
  title?: string,
  created_at: Date,
}
