export type UserRole = 'admin' | 'editor' | 'agent'

export type ArticleStatus = 'draft' | 'pending_review' | 'published' | 'redacted'

// Use `type` (not `interface`) so these satisfy Record<string, unknown> for Supabase GenericTable
export type Profile = {
  id: string
  role: UserRole
  display_name: string | null
  avatar_url: string | null
  is_agent: boolean
  created_at: string
}

export type Article = {
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

export type ApiKey = {
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

export type ProcessedWebhook = {
  id: string
  webhook_id: string
  payload: Record<string, unknown> | null
  processed_at: string
}

// Supabase Database type for typed client queries.
// Row types must use `type` aliases (not interfaces) so they satisfy
// Record<string, unknown> — required for @supabase/postgrest-js GenericTable.
// Tables require Relationships[] for GenericTable compatibility.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      articles: {
        Row: Article
        Insert: {
          id?: string
          title: string
          slug: string
          body: string
          status?: ArticleStatus
          burn_price?: number | null
          published_at?: string | null
          alpha_gate_until?: string | null
          cover_image_url?: string | null
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Article, 'id' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: 'articles_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      api_keys: {
        Row: ApiKey
        Insert: Omit<ApiKey, 'id' | 'created_at' | 'last_used_at'> & {
          id?: string
          created_at?: string
          last_used_at?: string | null
        }
        Update: Partial<Omit<ApiKey, 'id' | 'profile_id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'api_keys_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      processed_webhooks: {
        Row: ProcessedWebhook
        Insert: Omit<ProcessedWebhook, 'id' | 'processed_at'> & {
          id?: string
          processed_at?: string
        }
        Update: Partial<Omit<ProcessedWebhook, 'id' | 'processed_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
