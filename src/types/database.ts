export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          cover_url: string | null
          website: string | null
          location: string | null
          phone: string | null
          is_verified: boolean
          is_private: boolean
          email_notifications: boolean
          push_notifications: boolean
          online_status: boolean
          last_seen: string
          followers_count: number
          following_count: number
          posts_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          username: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          website?: string | null
          location?: string | null
          phone?: string | null
          is_verified?: boolean
          is_private?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          online_status?: boolean
          last_seen?: string
          followers_count?: number
          following_count?: number
          posts_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          website?: string | null
          location?: string | null
          phone?: string | null
          is_verified?: boolean
          is_private?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          online_status?: boolean
          last_seen?: string
          followers_count?: number
          following_count?: number
          posts_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string | null
          is_deleted: boolean
          likes_count: number
          comments_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          is_deleted?: boolean
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          is_deleted?: boolean
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_media: {
        Row: {
          id: string
          post_id: string
          url: string
          type: string
          thumbnail_url: string | null
          duration_seconds: number | null
          width: number | null
          height: number | null
          size_bytes: number | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          url: string
          type: string
          thumbnail_url?: string | null
          duration_seconds?: number | null
          width?: number | null
          height?: number | null
          size_bytes?: number | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          url?: string
          type?: string
          thumbnail_url?: string | null
          duration_seconds?: number | null
          width?: number | null
          height?: number | null
          size_bytes?: number | null
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          parent_id: string | null
          content: string
          likes_count: number
          replies_count: number
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          parent_id?: string | null
          content: string
          likes_count?: number
          replies_count?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          parent_id?: string | null
          content?: string
          likes_count?: number
          replies_count?: number
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          name: string | null
          is_group: boolean
          avatar_url: string | null
          created_by: string | null
          last_message_at: string
          last_message_preview: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          is_group?: boolean
          avatar_url?: string | null
          created_by?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          is_group?: boolean
          avatar_url?: string | null
          created_by?: string | null
          last_message_at?: string
          last_message_preview?: string | null
          created_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          is_admin: boolean
          last_read_at: string
          joined_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          is_admin?: boolean
          last_read_at?: string
          joined_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          is_admin?: boolean
          last_read_at?: string
          joined_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string | null
          content: string | null
          type: string
          media_url: string | null
          file_name: string | null
          file_size: number | null
          duration_seconds: number | null
          is_deleted: boolean
          reply_to_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: string | null
          content?: string | null
          type?: string
          media_url?: string | null
          file_name?: string | null
          file_size?: number | null
          duration_seconds?: number | null
          is_deleted?: boolean
          reply_to_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string | null
          content?: string | null
          type?: string
          media_url?: string | null
          file_name?: string | null
          file_size?: number | null
          duration_seconds?: number | null
          is_deleted?: boolean
          reply_to_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          type: string
          reference_id: string | null
          reference_type: string | null
          message: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          actor_id?: string | null
          type: string
          reference_id?: string | null
          reference_type?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          actor_id?: string | null
          type?: string
          reference_id?: string | null
          reference_type?: string | null
          message?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          id: string
          email: string
          user_id: string | null
          code: string
          type: string
          expires_at: string
          is_used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          user_id?: string | null
          code: string
          type: string
          expires_at: string
          is_used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          user_id?: string | null
          code?: string
          type?: string
          expires_at?: string
          is_used?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Named types derived from the Database schema (single source of truth)
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostMedia = Database['public']['Tables']['post_media']['Row'] & {
  type: 'image' | 'video'
}
export type PostLike = Database['public']['Tables']['post_likes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type CommentLike = Database['public']['Tables']['comment_likes']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row']
export type Message = Database['public']['Tables']['messages']['Row'] & {
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
}
export type MessageRead = Database['public']['Tables']['message_reads']['Row']
export type AppNotification = Database['public']['Tables']['notifications']['Row'] & {
  type: 'like_post' | 'like_comment' | 'comment' | 'reply' | 'follow' | 'mention' | 'message'
  reference_type: 'post' | 'comment' | 'message' | 'conversation' | 'user' | null
}
export type VerificationCode = Database['public']['Tables']['verification_codes']['Row'] & {
  type: 'email_verification' | 'password_reset'
}

// Enriched types returned from queries
export interface PostWithDetails extends Post {
  author: Profile
  media: PostMedia[]
  is_liked?: boolean
  is_following_author?: boolean
}

export interface CommentWithDetails extends Comment {
  author: Profile
  is_liked?: boolean
  replies?: CommentWithDetails[]
}

export interface ConversationWithDetails extends Conversation {
  participants: (ConversationParticipant & { profile: Profile })[]
  last_message?: Message & { sender?: Profile }
  unread_count?: number
}

export interface MessageWithSender extends Message {
  sender: Profile | null
  reply_to?: Message & { sender?: Profile }
}

export interface NotificationWithActor extends AppNotification {
  actor?: Profile
  post_id?: string | null // populated for comment/reply/like_comment/mention notifications
}

// Keep Notification as alias for backwards compatibility
export type Notification = AppNotification
