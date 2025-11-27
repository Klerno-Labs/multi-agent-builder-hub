import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMRequest, LLMResponse } from './types';

/**
 * Gemini client for Google's Generative AI models
 * Supports Gemini 2.0 Flash Thinking for deep reasoning tasks
 */
export async function runWithGemini(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: request.model,
    generationConfig: {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 2048,
      topP: request.topP ?? 0.95,
    },
  });

  // Convert OpenAI message format to Gemini format
  const geminiMessages = convertMessagesToGemini(request.messages);

  try {
    // Regular chat completion (no tool calling enabled here)
    const chat = model.startChat({
      history: geminiMessages.history,
    });

    const result = await chat.sendMessage(geminiMessages.lastMessage);
    const response = result.response;

    return {
      output: response.text(),
      raw: response,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Convert OpenAI message format to Gemini format
 */
function convertMessagesToGemini(messages: Array<{ role: string; content: string }>) {
  const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  let lastMessage = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLast = i === messages.length - 1;

    if (isLast) {
      // Save last message separately (Gemini requires it)
      lastMessage = msg.content;
    } else {
      // Convert role: OpenAI uses 'assistant', Gemini uses 'model'
      const role = msg.role === 'assistant' ? 'model' : 'user';

      // Gemini requires alternating user/model messages
      if (history.length > 0 && history[history.length - 1].role === role) {
        // Merge with previous message if same role
        history[history.length - 1].parts.push({ text: msg.content });
      } else {
        history.push({
          role: role as 'user' | 'model',
          parts: [{ text: msg.content }],
        });
      }
    }
  }

  return { history, lastMessage };
}
