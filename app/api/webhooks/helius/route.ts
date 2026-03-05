import 'server-only'
import { EventParser, BorshCoder } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { createAdminClient } from '@/lib/supabase/server'
import idl from '@/anchor/target/idl/burn_for_article.json'
import { bytesToUUID } from '@/lib/burn/utils'

// ---------------------------------------------------------------------------
// Module-level constants — initialized once at startup
// ---------------------------------------------------------------------------

const PROGRAM_ID = new PublicKey('DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW')
const coder = new BorshCoder(idl as Parameters<typeof BorshCoder>[0])
const eventParser = new EventParser(PROGRAM_ID, coder)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeliusTx {
  transaction?: { signatures?: string[] }
  meta?: { logMessages?: string[] }
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/helius
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // --- Auth check ---
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== process.env.HELIUS_WEBHOOK_AUTH) {
    return new Response('Unauthorized', { status: 401 })
  }

  // --- Parse body ---
  const body = await request.json()
  const transactions: HeliusTx[] = Array.isArray(body) ? body : [body]

  // --- Process each transaction ---
  for (const tx of transactions) {
    const signature = tx.transaction?.signatures?.[0]
    const logMessages: string[] = tx.meta?.logMessages ?? []

    // Parse Anchor events from log messages
    const events = [...eventParser.parseLogs(logMessages)]
    const killedEvent = events.find((e) => e.name === 'ArticleKilled')

    // Skip if no ArticleKilled event in this transaction
    if (!killedEvent) {
      continue
    }

    // Extract event fields
    const articleId = bytesToUUID(killedEvent.data.article_id as number[])
    const burnerWallet = (killedEvent.data.burner as { toString(): string }).toString()
    // Keep as string for BIGINT safety — Supabase accepts string for bigint columns
    const amountBurned = (killedEvent.data.amount as { toString(): string }).toString()
    const timestamp = new Date(
      (killedEvent.data.timestamp as { toNumber(): number }).toNumber() * 1000
    ).toISOString()

    const supabase = createAdminClient()

    // --- Idempotency: insert into processed_webhooks ---
    const { error: insertError } = await supabase
      .from('processed_webhooks')
      .insert({ webhook_id: signature, payload: tx })

    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        // Unique violation — already processed this transaction, silently accept
        return new Response('Already processed', { status: 200 })
      }
      // Other insert errors — log and continue (non-blocking)
      console.error('[helius-webhook] processed_webhooks insert error:', insertError)
      continue
    }

    // --- Update article to redacted with burn details ---
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'redacted',
        burned_by: burnerWallet,
        burned_amount: amountBurned,
        burn_tx: signature,
        burned_at: timestamp,
      })
      .eq('id', articleId)

    if (updateError) {
      console.error('[helius-webhook] articles update error:', updateError)
      // Return 500 so Helius retries delivery
      return new Response('DB update failed', { status: 500 })
    }
  }

  return new Response('OK', { status: 200 })
}
