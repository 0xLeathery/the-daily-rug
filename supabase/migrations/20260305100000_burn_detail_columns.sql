-- Phase 6: Add burn detail columns to articles table
-- One burn per article (enforced by Anchor PDA init constraint), so 1:1 on articles table
ALTER TABLE public.articles
  ADD COLUMN burned_by     TEXT,          -- burner wallet pubkey
  ADD COLUMN burned_amount BIGINT,        -- raw token amount (u64, includes decimals)
  ADD COLUMN burn_tx       TEXT,          -- transaction signature
  ADD COLUMN burned_at     TIMESTAMPTZ;   -- timestamp from on-chain event
