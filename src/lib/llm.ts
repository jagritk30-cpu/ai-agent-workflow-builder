export interface LLMConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
}

export async function callGemini(prompt: string, systemPrompt?: string, config?: LLMConfig): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: config?.temperature ?? 0.7,
      topK: config?.topK,
      topP: config?.topP,
    },
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  let attempt = 0;
  const maxRetries = 2;
  const backoffMs = [1000, 2000];

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('Invalid response format from Gemini API');
      }

      return text;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to call Gemini after ${maxRetries} retries. Last error: ${(error as Error).message}`);
      }
      await new Promise(res => setTimeout(res, backoffMs[attempt]));
      attempt++;
    }
  }

  throw new Error('Unreachable');
}
