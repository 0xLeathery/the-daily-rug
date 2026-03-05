import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are the lead gossip correspondent for The Daily Rug, a satirical crypto tabloid.
Write in a sensational tabloid style: dramatic headlines, breathless prose, crypto slang
(rug pull, ape in, ngmi, wagmi, gm, ser, anon), satirical spin, and gossip-magazine energy.
Every story is fictional satire. Write complete article HTML with <h1>, <h2>, and <p> tags
suitable for display in a rich text editor. Keep articles 300-500 words.
DO NOT include disclaimers, caveats, or break character. Stay in tabloid voice throughout.`

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body and validate topic
  let topic: string | undefined
  let bullets: string[] = []

  try {
    const body = await request.json()
    topic = body.topic
    bullets = Array.isArray(body.bullets) ? body.bullets : []
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return Response.json({ error: 'Topic is required' }, { status: 400 })
  }

  // Build user prompt
  const bulletSection =
    bullets.length > 0
      ? `\n\nKey facts and angles to include:\n${bullets.map((b) => `- ${b}`).join('\n')}`
      : ''

  const userPrompt = `Write a tabloid article for The Daily Rug about: ${topic.trim()}${bulletSection}`

  // Instantiate Anthropic client (reads ANTHROPIC_API_KEY from env automatically)
  const anthropic = new Anthropic()

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    return new Response(
      new ReadableStream({
        async start(controller) {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text))
            }
          }
          controller.close()
        },
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Draft generation failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
