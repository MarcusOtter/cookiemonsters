import { OPENAI_API_KEY } from "$env/static/private";
import { Configuration, OpenAIApi } from "openai";

/**
 * Sends a request to the OpenAI Chat API.
 * @async
 * @param {string} system - System message for the Chat API.
 * @param {string} input - User message for the Chat API.
 * @param {number} maxOutputTokens - Maximum number of tokens for the API response.
 * @returns {Promise<Object>} The message object from the API response.
 */
export async function sendChatAPIRequest(system: string, input: string, maxOutputTokens: number) {
	if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not defined in your .env file");

	const configuration = new Configuration({
		apiKey: OPENAI_API_KEY,
	});
	const openai = new OpenAIApi(configuration);
	console.log(input);
	const completion = await openai.createChatCompletion({
		model: "gpt-3.5-turbo",
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: input },
		],
		max_tokens: maxOutputTokens,
		temperature: 0,
	});
	console.log(completion.data.usage);
	return completion.data.choices[0].message;
}
