-- =============================================================================
-- The Daily Rug Initial Schema Migration
-- Created: 2026-03-05
-- =============================================================================
-- Tables: profiles, articles, api_keys, processed_webhooks
-- Functions: update_updated_at, handle_new_user, get_my_role,
--            custom_access_token_hook, create_api_key, validate_api_key
-- RLS Policies: role-based access using get_my_role() caching pattern
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- profiles: linked to auth.users, holds role and display metadata
CREATE TABLE public.profiles (
  id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL DEFAULT 'editor'
                           CHECK (role IN ('admin', 'editor', 'agent')),
  display_name TEXT,
  avatar_url   TEXT,
  is_agent     BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase auth.users. Holds RBAC role and display metadata.';


-- articles: the core content table for The Daily Rug news articles
CREATE TABLE public.articles (
  id                UUID        NOT NULL DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,
  body              TEXT        NOT NULL DEFAULT '',
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'pending_review', 'published', 'redacted')),
  burn_price        NUMERIC(20, 0),
  published_at      TIMESTAMPTZ,
  alpha_gate_until  TIMESTAMPTZ,
  cover_image_url   TEXT,
  author_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT articles_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_articles_author_id ON public.articles(author_id);
CREATE INDEX idx_articles_status    ON public.articles(status);

COMMENT ON TABLE public.articles IS 'News articles. burn_price set by admin enables the on-chain burn-to-redact mechanic in Phase 6.';


-- api_keys: bearer token auth for agent (AI bot) access
-- Raw tokens are never stored — only bcrypt hashes via pgcrypto crypt()
CREATE TABLE public.api_keys (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  key_prefix   VARCHAR(8)  NOT NULL UNIQUE,
  key_hash     TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  CONSTRAINT api_keys_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_api_keys_key_prefix  ON public.api_keys(key_prefix);
CREATE INDEX idx_api_keys_profile_id  ON public.api_keys(profile_id);

COMMENT ON TABLE public.api_keys IS 'API bearer tokens for agent profiles. Only bcrypt hashes stored — raw tokens are discarded after creation.';


-- processed_webhooks: idempotency table for Helius burn-event webhooks (Phase 6)
CREATE TABLE public.processed_webhooks (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  webhook_id   TEXT        NOT NULL UNIQUE,
  payload      JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT processed_webhooks_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_processed_webhooks_webhook_id ON public.processed_webhooks(webhook_id);

COMMENT ON TABLE public.processed_webhooks IS 'Idempotency log for Helius webhooks. Prevents double-processing of burn events.';


-- =============================================================================
-- 3. TRIGGER FUNCTIONS
-- =============================================================================

-- update_updated_at: keeps articles.updated_at current on every row update
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- handle_new_user: auto-creates a profile row when a new auth user is created
-- SECURITY DEFINER runs with the function owner's privileges (not the invoker's)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, is_agent)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'is_agent')::BOOLEAN, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 4. SECURITY & ROLE FUNCTIONS
-- =============================================================================

-- get_my_role: reads user_role from the JWT claim (baked in by custom_access_token_hook)
-- SECURITY DEFINER + STABLE allows Postgres to cache the result per query, avoiding
-- repeated JWT parsing — the caching pattern used in all RLS policies below.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
SECURITY DEFINER
STABLE
LANGUAGE sql
AS $$
  SELECT (auth.jwt() ->> 'user_role')::TEXT;
$$;


-- custom_access_token_hook: called by Supabase Auth when issuing JWTs.
-- Reads the role from profiles table and bakes it into the JWT as 'user_role'.
-- This means RLS policies can read the role from JWT (fast) instead of querying profiles.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
SECURITY DEFINER
STABLE
LANGUAGE plpgsql
AS $$
DECLARE
  claims   JSONB;
  user_role TEXT;
BEGIN
  -- Fetch the role from profiles for the signing user
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  -- Merge 'user_role' into the JWT claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(COALESCE(user_role, 'editor')));

  -- Return the event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to supabase_auth_admin so Auth can invoke this hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

COMMENT ON FUNCTION public.custom_access_token_hook IS 'Custom Access Token Hook — bakes user_role into JWT claims so RLS policies can read role without a profiles table lookup.';


-- =============================================================================
-- 5. API KEY FUNCTIONS
-- =============================================================================

-- create_api_key: inserts a new api_key row with a bcrypt hash of the raw token.
-- The raw token is NEVER stored. Caller generates the random token, passes it here,
-- and stores only the returned key_prefix for lookup.
CREATE OR REPLACE FUNCTION public.create_api_key(
  p_profile_id UUID,
  p_name       TEXT,
  p_key_prefix VARCHAR(8),
  p_raw_token  TEXT
)
RETURNS TABLE (id UUID)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.api_keys (profile_id, name, key_prefix, key_hash)
  VALUES (
    p_profile_id,
    p_name,
    p_key_prefix,
    crypt(p_raw_token, gen_salt('bf', 12))
  )
  RETURNING api_keys.id;
END;
$$;


-- validate_api_key: looks up an api_key by prefix, checks active + expiry, validates
-- the bcrypt hash. Returns is_valid, profile_id, key_id.
-- Updates last_used_at on successful validation.
CREATE OR REPLACE FUNCTION public.validate_api_key(
  p_raw_token  TEXT,
  p_key_prefix VARCHAR(8)
)
RETURNS TABLE (
  is_valid   BOOLEAN,
  profile_id UUID,
  key_id     UUID
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_key RECORD;
BEGIN
  SELECT ak.id, ak.profile_id, ak.key_hash, ak.is_active, ak.expires_at
  INTO v_key
  FROM public.api_keys ak
  WHERE ak.key_prefix = p_key_prefix;

  -- Return invalid if key not found, inactive, or expired
  IF NOT FOUND
     OR NOT v_key.is_active
     OR (v_key.expires_at IS NOT NULL AND v_key.expires_at < now())
  THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Validate bcrypt hash
  IF v_key.key_hash = crypt(p_raw_token, v_key.key_hash) THEN
    -- Update last_used_at on successful validation
    UPDATE public.api_keys
    SET last_used_at = now()
    WHERE id = v_key.id;

    RETURN QUERY SELECT true, v_key.profile_id, v_key.id;
  ELSE
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID;
  END IF;
END;
$$;


-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 7. RLS POLICIES
-- =============================================================================
-- ALL role checks use (SELECT public.get_my_role()) — the caching pattern.
-- ALL uid checks use (SELECT auth.uid()) — the caching pattern.
-- This prevents repeated function calls within a single query.

-- ---- ARTICLES ---------------------------------------------------------------

-- Anyone (anon or authenticated) can read published articles
CREATE POLICY "articles_public_read_anon"
  ON public.articles FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "articles_public_read_authenticated"
  ON public.articles FOR SELECT
  TO authenticated
  USING (true);

-- Admins have full CRUD on articles
CREATE POLICY "articles_admin_insert"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_my_role()) = 'admin');

CREATE POLICY "articles_admin_update"
  ON public.articles FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_my_role()) = 'admin')
  WITH CHECK ((SELECT public.get_my_role()) = 'admin');

CREATE POLICY "articles_admin_delete"
  ON public.articles FOR DELETE
  TO authenticated
  USING ((SELECT public.get_my_role()) = 'admin');

-- Editors can insert articles in draft or pending_review status as themselves
CREATE POLICY "articles_editor_insert_own"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_my_role()) = 'editor'
    AND author_id = (SELECT auth.uid())
    AND status IN ('draft', 'pending_review')
  );

-- Editors can update their own articles that are in draft or pending_review
CREATE POLICY "articles_editor_update_own"
  ON public.articles FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.get_my_role()) = 'editor'
    AND author_id = (SELECT auth.uid())
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (
    (SELECT public.get_my_role()) = 'editor'
    AND author_id = (SELECT auth.uid())
    AND status IN ('draft', 'pending_review')
  );

-- Agents can insert articles (API ingest)
CREATE POLICY "articles_agent_insert"
  ON public.articles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_my_role()) = 'agent');


-- ---- PROFILES ---------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "profiles_self_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- Admins can read all profiles
CREATE POLICY "profiles_admin_read_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT public.get_my_role()) = 'admin');

-- Users can update their own profile (non-role fields — role changes go through admin)
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()))
  );

-- Admins can update any profile (including role changes)
CREATE POLICY "profiles_admin_update_all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_my_role()) = 'admin')
  WITH CHECK ((SELECT public.get_my_role()) = 'admin');


-- ---- API_KEYS ---------------------------------------------------------------
-- No public access — api_keys managed exclusively via SECURITY DEFINER functions

CREATE POLICY "api_keys_deny_anon"
  ON public.api_keys FOR ALL
  TO anon
  USING (false);

CREATE POLICY "api_keys_deny_authenticated"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (false);


-- ---- PROCESSED_WEBHOOKS -----------------------------------------------------
-- No public access — webhook processing happens server-side via admin client

CREATE POLICY "processed_webhooks_deny_anon"
  ON public.processed_webhooks FOR ALL
  TO anon
  USING (false);
