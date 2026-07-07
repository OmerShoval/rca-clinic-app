export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/** How a stored video URL should be resolved/rendered. Kept in sync with lib/video.ts detectProvider(). */
export type VideoProvider =
  | "cloudflare" // Cloudflare Stream (HLS)
  | "youtube"
  | "vimeo"
  | "drive"
  | "gif" // animated image, rendered as <img>
  | "direct" // native <video> (mp4/mov/webm incl. Supabase Storage)
  | "link"; // unknown → external anchor

/** Where in the app a library video originated — used to tag & filter the library. */
export type VideoSourceType =
  | "debrief_block"
  | "session"
  | "strategy_node"
  | "back_home"
  | "reply"
  | "reference"
  | "student_clip"
  | "manual";

export type VideoKind = "session" | "node" | "reference";
export type VideoStatus = "uploading" | "processing" | "ready" | "error";

export interface Database {
  rca: {
    Tables: {
      clinics: {
        Row: {
          id: number;
          number: number;
          name: string;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          status: "upcoming" | "active" | "completed";
          created_at: string;
        };
        Insert: {
          number: number;
          name: string;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "upcoming" | "active" | "completed";
        };
        Update: {
          number?: number;
          name?: string;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: "upcoming" | "active" | "completed";
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          clinic_id: number;
          full_name: string;
          slug: string;
          pin_hash: string | null;
          focus_skill: string | null;
          whatsapp_number: string | null;
          status: "draft" | "live";
          created_at: string;
          build_strategy: Record<string, unknown> | null;
          training_program: Record<string, unknown> | null;
        };
        Insert: {
          clinic_id: number;
          full_name: string;
          slug: string;
          pin_hash?: string | null;
          focus_skill?: string | null;
          whatsapp_number?: string | null;
          status?: "draft" | "live";
          build_strategy?: Record<string, unknown> | null;
          training_program?: Record<string, unknown> | null;
        };
        Update: {
          clinic_id?: number;
          full_name?: string;
          slug?: string;
          pin_hash?: string | null;
          focus_skill?: string | null;
          whatsapp_number?: string | null;
          status?: "draft" | "live";
          build_strategy?: Record<string, unknown> | null;
          training_program?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          student_id: string;
          device_token: string;
          created_at: string;
        };
        Insert: {
          student_id: string;
          device_token?: string;
        };
        Update: {
          student_id?: string;
          device_token?: string;
        };
        Relationships: [];
      };
      debriefs: {
        Row: {
          id: string;
          student_id: string;
          wave_label: string;
          day_number: number | null;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string;
          tag: string | null;
          cover_color_index: number | null;
          cover_image_url: string | null;
          session_video_url: string | null;
          summary_went_well: string | null;
          summary_learned: string | null;
          summary_coach_view: string | null;
          summary_felt: string | null;
          summary_grateful: string | null;
        };
        Insert: {
          student_id: string;
          wave_label: string;
          day_number?: number | null;
          status?: "draft" | "published";
          published_at?: string | null;
          tag?: string | null;
          cover_color_index?: number | null;
          cover_image_url?: string | null;
          session_video_url?: string | null;
          summary_went_well?: string | null;
          summary_learned?: string | null;
          summary_coach_view?: string | null;
          summary_felt?: string | null;
          summary_grateful?: string | null;
        };
        Update: {
          wave_label?: string;
          day_number?: number | null;
          status?: "draft" | "published";
          published_at?: string | null;
          tag?: string | null;
          cover_color_index?: number | null;
          cover_image_url?: string | null;
          session_video_url?: string | null;
          summary_went_well?: string | null;
          summary_learned?: string | null;
          summary_coach_view?: string | null;
          summary_felt?: string | null;
          summary_grateful?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      debrief_blocks: {
        Row: {
          id: string;
          debrief_id: string;
          type: "mistake" | "correction" | "improvement" | "goal" | "next_step";
          sort: number;
          title: string | null;
          body: string | null;
          felt_sense_quote: string | null;
          timestamp_marker: string | null;
          where_on_wave: string | null;
          why_it_happened: string | null;
          video_url: string | null;
          video_url_secondary: string | null;
          created_at: string;
          movement_id: string | null;
        };
        Insert: {
          debrief_id: string;
          type: "mistake" | "correction" | "improvement" | "goal" | "next_step";
          sort?: number;
          title?: string | null;
          body?: string | null;
          felt_sense_quote?: string | null;
          timestamp_marker?: string | null;
          where_on_wave?: string | null;
          why_it_happened?: string | null;
          video_url?: string | null;
          video_url_secondary?: string | null;
          movement_id?: string | null;
        };
        Update: {
          type?: "mistake" | "correction" | "improvement" | "goal" | "next_step";
          sort?: number;
          title?: string | null;
          body?: string | null;
          felt_sense_quote?: string | null;
          timestamp_marker?: string | null;
          where_on_wave?: string | null;
          why_it_happened?: string | null;
          video_url?: string | null;
          video_url_secondary?: string | null;
          movement_id?: string | null;
        };
        Relationships: [];
      };
      translations: {
        Row: {
          id: string;
          student_id: string;
          environment: "israel_ocean" | "wave_pool";
          whats_different: string | null;
          try_first: string | null;
          on_wave_reminder: string | null;
          video_url: string | null;
          personal_note_url: string | null;
          created_at: string;
        };
        Insert: {
          student_id: string;
          environment: "israel_ocean" | "wave_pool";
          whats_different?: string | null;
          try_first?: string | null;
          on_wave_reminder?: string | null;
          video_url?: string | null;
          personal_note_url?: string | null;
        };
        Update: {
          whats_different?: string | null;
          try_first?: string | null;
          on_wave_reminder?: string | null;
          video_url?: string | null;
          personal_note_url?: string | null;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          student_id: string;
          log_date: string;
          completed_habits: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          student_id: string;
          log_date: string;
          completed_habits?: string[];
          notes?: string | null;
        };
        Update: {
          completed_habits?: string[];
          notes?: string | null;
        };
        Relationships: [];
      };
      threads: {
        Row: {
          id: string;
          student_id: string;
          title: string | null;
          question_text: string;
          clip_url: string | null;
          status: "new" | "in_review" | "answered";
          reply_url: string | null;
          reply_type: "video" | "voice" | "whatsapp" | null;
          submitted_at: string;
          answered_at: string | null;
          step_ref: string | null;
        };
        Insert: {
          student_id: string;
          title?: string | null;
          question_text: string;
          clip_url?: string | null;
          status?: "new" | "in_review" | "answered";
          reply_url?: string | null;
          reply_type?: "video" | "voice" | "whatsapp" | null;
          answered_at?: string | null;
          step_ref?: string | null;
        };
        Update: {
          title?: string | null;
          question_text?: string;
          clip_url?: string | null;
          status?: "new" | "in_review" | "answered";
          reply_url?: string | null;
          reply_type?: "video" | "voice" | "whatsapp" | null;
          answered_at?: string | null;
          step_ref?: string | null;
        };
        Relationships: [];
      };
      student_videos: {
        Row: {
          id: string;
          student_id: string;
          video_url: string;
          label: string;
          day_number: number | null;
          kind: VideoKind;
          debrief_id: string | null;
          created_at: string;
          // phase0 analysis columns
          movement_id: string | null;
          wave_type: string | null;
          is_best: boolean;
          analysis: Json | null;
          // video-library columns
          provider: VideoProvider | null;
          stream_uid: string | null;
          poster_url: string | null;
          duration_s: number | null;
          size_bytes: number | null;
          mime_type: string | null;
          original_filename: string | null;
          tags: string[];
          source_type: VideoSourceType | null;
          source_id: string | null;
          status: VideoStatus;
          checksum: string | null;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          video_url: string;
          label?: string;
          day_number?: number | null;
          kind?: VideoKind;
          debrief_id?: string | null;
          movement_id?: string | null;
          wave_type?: string | null;
          is_best?: boolean;
          analysis?: Json | null;
          provider?: VideoProvider | null;
          stream_uid?: string | null;
          poster_url?: string | null;
          duration_s?: number | null;
          size_bytes?: number | null;
          mime_type?: string | null;
          original_filename?: string | null;
          tags?: string[];
          source_type?: VideoSourceType | null;
          source_id?: string | null;
          status?: VideoStatus;
          checksum?: string | null;
        };
        Update: {
          video_url?: string;
          label?: string;
          day_number?: number | null;
          kind?: VideoKind;
          debrief_id?: string | null;
          movement_id?: string | null;
          wave_type?: string | null;
          is_best?: boolean;
          analysis?: Json | null;
          provider?: VideoProvider | null;
          stream_uid?: string | null;
          poster_url?: string | null;
          duration_s?: number | null;
          size_bytes?: number | null;
          mime_type?: string | null;
          original_filename?: string | null;
          tags?: string[];
          source_type?: VideoSourceType | null;
          source_id?: string | null;
          status?: VideoStatus;
          checksum?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
  };
}

/* ── Convenience row types ── */
export type Clinic       = Database["rca"]["Tables"]["clinics"]["Row"];
export type Student      = Database["rca"]["Tables"]["students"]["Row"];
export type AuthSession  = Database["rca"]["Tables"]["sessions"]["Row"];
export type Debrief      = Database["rca"]["Tables"]["debriefs"]["Row"];
export type DebriefBlock = Database["rca"]["Tables"]["debrief_blocks"]["Row"];
export type Translation  = Database["rca"]["Tables"]["translations"]["Row"];
export type Thread       = Database["rca"]["Tables"]["threads"]["Row"];
export type Tag          = Database["rca"]["Tables"]["tags"]["Row"];
export type HabitLogRow  = Database["rca"]["Tables"]["habit_logs"]["Row"];
export type StudentVideo = Database["rca"]["Tables"]["student_videos"]["Row"];
/** A video-library item joined with its student's display fields (as returned by the library API). */
export type LibraryVideo = StudentVideo & {
  student_name?: string | null;
  student_slug?: string | null;
};
