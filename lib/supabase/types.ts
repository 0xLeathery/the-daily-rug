export type UserRole = 'admin' | 'editor' | 'agent'

export type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'redacted'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  is_agent: boolean
  created_at: string
}

export interface Article {
  id: string
  title: string
  slug: string
  body: string
  status: ArticleStatus
  burn_price: number | null
  published_at: string | null
  alpha_gate_until: string | null
  cover_image_url: string | null
  author_id: string | null
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  profile_id: string
  name: string
  key_prefix: string
  key_hash: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
}

export interface ProcessedWebhook {
  id: string
  webhook_id: string
  payload: Record<string, unknown> | null
  processed_at: string
}

// Supabase Database type for typed client queries
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      articles: {
        Row: Article
        Insert: Omit<Article, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Article, 'id' | 'created_at' | 'updated_at'>>
      }
      api_keys: {
        Row: ApiKey
        Insert: Omit<ApiKey, 'id' | 'created_at' | 'last_used_at'> & {
          id?: string
          created_at?: string
          last_used_at?: string | null
        }
        Update: Partial<Omit<ApiKey, 'id' | 'profile_id' | 'created_at'>>
      }
      processed_webhooks: {
        Row: ProcessedWebhook
        Insert: Omit<ProcessedWebhook, 'id' | 'processed_at'> & {
          id?: string
          processed_at?: string
        }
        Update: Partial<Omit<ProcessedWebhook, 'id' | 'processed_at'>>
      }
    }
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
      create_api_key: {
        Args: {
          p_profile_id: string
          p_name: string
          p_key_prefix: string
          p_raw_token: string
        }
        Returns: { id: string }[]
      }
      validate_api_key: {
        Args: {
          p_raw_token: string
          p_key_prefix: string
        }
        Returns: { is_valid: boolean; profile_id: string; key_id: string }[]
      }
    }
  }
}
