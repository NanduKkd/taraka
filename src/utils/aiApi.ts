import axios from 'axios';
import { modelData, UserContentBlock, ToolResultContentBlock } from '../types/common';
import { Readable } from 'node:stream';

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
		const res = await aiApi({ method: 'POST', data: { session_id, id: prompt_id, messageContent: content, model: modelData[0], provider: modelData[1] }, responseType: 'stream' });
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

export default aiApi;
