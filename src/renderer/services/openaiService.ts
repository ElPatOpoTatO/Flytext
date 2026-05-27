import OpenAI from 'openai'

const SYSTEM_PROMPT = `Eres un asistente de edición de textos conciso y útil.
Ayuda a mejorar, traducir, resumir, reformatear y refinar texto según lo que el usuario pida.
Responde directamente con el texto editado o la explicación, sin preámbulos innecesarios.`

export async function* streamChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  apiKey: string,
): AsyncGenerator<string, void, unknown> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream: true,
    max_tokens: 2048,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}
