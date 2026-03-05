-- Fix: allow anon users to read redacted articles (tombstone pages are public)
-- The original policy only allowed status='published', which blocked redacted
-- article detail pages from rendering the tombstone graphic.

DROP POLICY "articles_public_read_anon" ON public.articles;

CREATE POLICY "articles_public_read_anon"
  ON public.articles FOR SELECT
  TO anon
  USING (status IN ('published', 'redacted'));
