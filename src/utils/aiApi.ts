import axios from 'axios';
import { modelData, UserContentBlock, ToolResultContentBlock } from '../types/common';
import { Readable } from 'node:stream';
import { AxiosError } from 'axios';

const aiApi = axios.create({
	headers: {
	},
	baseURL: process.env.AI_BASE_URL,
});

export const setAuth = (token: string) => {
	aiApi.defaults.headers.Authorization = 'Bearer '+token;
}

class AiApiError extends Error {
	data: any;
	statusCode: number;
	constructor(message: string, statusCode: number, data: any) {
		super(message);
		this.statusCode = statusCode;
		this.data = data;
	}
}

export const sendMessage = async(prompt_id: string, session_id: number, content: ToolResultContentBlock[] | UserContentBlock[], model: modelData): Promise<Readable> => {
	try {
		const modelData = model.split(' ');
		const res = await aiApi({ method: 'POST', data: { type: 'chat', session_id, id: prompt_id, messageContent: content, model: modelData[1], provider: modelData[0] }, responseType: 'stream' });
		return res.data;
	} catch (error) {
		if(!(error instanceof Error))
			throw new Error('Something went wrong');
		if(error instanceof axios.AxiosError && error.response) {
			throw new AiApiError(error.message, error.response.status, error.response.data);
		} else if(error.cause) {
			throw error.cause;
		} else {
			throw new Error(error.message);
		}
	}
}
export const sendCodeReplace = async({ filePath, actualCode, newCode }: {filePath: string, actualCode: string, newCode: string}): Promise<string> => {
  try {
    const res = await aiApi({ method: 'POST', data: { type: 'code_replace', filePath, actualCode, newCode } })
  console.log(res.data)
  return res.data.code;
  } catch (error) {
    console.error(error)
    if(error instanceof AxiosError && error.response?.data)
      console.log(error.response.data, error.response.status);
    throw error;
  }
}

export default aiApi;
