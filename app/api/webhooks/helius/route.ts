import 'server-only'
import { EventParser, BorshCoder, type Idl } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { createAdminClient } from '@/lib/supabase/server'
import idl from '@/anchor/target/idl/burn_for_article.json'
import { bytesToUUID } from '@/lib/burn/utils'

// ---------------------------------------------------------------------------
// Module-level constants — initialized once at startup
// ---------------------------------------------------------------------------

const PROGRAM_ID = new PublicKey('DPJfqPk8yu6Fzu2aUQLY2DvFCPmhJ4zkZa2G8ZjKNeQW')
const coder = new BorshCoder(idl as Idl)
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

  // --- Per-tx error tracking for GAP-WH-02 ---
  let processedCount = 0
  let errorCount = 0

  // --- Process each transaction ---
  for (const tx of transactions) {
    const signature = tx.transaction?.signatures?.[0]

    // INT-02: Skip transactions without a signature to prevent NOT NULL violation
    // on processed_webhooks.webhook_id insert
    if (!signature) {
      console.warn('[helius-webhook] Skipping tx with missing signature')
      continue
    }

    const logMessages: string[] = tx.meta?.logMessages ?? []

    // Parse Anchor events from log messages
    const events = [...eventParser.parseLogs(logMessages)]
    const killedEvent = events.find((e) => e.name === 'ArticleKilled')

    // Skip if no ArticleKilled event in this transaction
    if (!killedEvent) {
      continue
    }

    // GAP-WH-03 + GAP-WH-04: Validate required event fields before accessing them
    // null/undefined article_id, burner, amount, or timestamp → skip tx gracefully
    if (
      !killedEvent.data.article_id ||
      !killedEvent.data.burner ||
      !killedEvent.data.amount ||
      !killedEvent.data.timestamp
    ) {
      console.error('[helius-webhook] Missing required event fields, skipping tx:', signature)
      continue
    }

    // Extract event fields
    const articleId = bytesToUUID(killedEvent.data.article_id as number[])
    const burnerWallet = (killedEvent.data.burner as { toString(): string }).toString()
    const amountBurned = (killedEvent.data.amount as { toNumber(): number }).toNumber()
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
        // GAP-WH-01: Unique violation — already processed this tx.
        // Use `continue` (not `return`) so remaining txs in the batch are still processed.
        continue
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
      // GAP-WH-02: Track per-tx failure instead of returning 500 immediately.
      // This allows successfully-processed txs to count even if later txs fail.
      errorCount++
      continue
    }

    processedCount++
  }

  // GAP-WH-02: Only return 500 if ALL processable txs failed (triggers Helius retry).
  // If at least one tx succeeded, return 200.
  if (processedCount === 0 && errorCount > 0) {
    return new Response('All updates failed', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
