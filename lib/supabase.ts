import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for API routes)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export type Database = {
  public: {
    Tables: {
      playlists: {
        Row: {
          id: string;
          created_at: string;
          youtube_playlist_id: string;
          title: string;
          description: string | null;
          channel_title: string | null;
          thumbnail_url: string | null;
          grade: string | null;
          subject: string | null;
          video_count: number;
          slug: string;
          google_sheet_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          youtube_playlist_id: string;
          title: string;
          description?: string | null;
          channel_title?: string | null;
          thumbnail_url?: string | null;
          grade?: string | null;
          subject?: string | null;
          video_count?: number;
          slug: string;
          google_sheet_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          youtube_playlist_id?: string;
          title?: string;
          description?: string | null;
          channel_title?: string | null;
          thumbnail_url?: string | null;
          grade?: string | null;
          subject?: string | null;
          video_count?: number;
          slug?: string;
          google_sheet_url?: string | null;
        };
      };
      playlist_videos: {
        Row: {
          id: string;
          playlist_id: string;
          youtube_video_id: string;
          title: string;
          thumbnail_url: string | null;
          assessment_quiz_id: string | null;
          assessment_link: string | null;
          interactive_video_quiz_id: string | null;
          interactive_video_link: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          youtube_video_id: string;
          title: string;
          thumbnail_url?: string | null;
          assessment_quiz_id?: string | null;
          assessment_link?: string | null;
          interactive_video_quiz_id?: string | null;
          interactive_video_link?: string | null;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          youtube_video_id?: string;
          title?: string;
          thumbnail_url?: string | null;
          assessment_quiz_id?: string | null;
          assessment_link?: string | null;
          interactive_video_quiz_id?: string | null;
          interactive_video_link?: string | null;
          order_index?: number;
          created_at?: string;
        };
      };
      video_quiz_keys: {
        Row: {
          id: string;
          youtube_video_id: string;
          quiz_gen_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          youtube_video_id: string;
          quiz_gen_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          youtube_video_id?: string;
          quiz_gen_key?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

