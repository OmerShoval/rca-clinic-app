export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface KeyPoint {
  point: string;
  feel: string;
}

export interface Database {
  rca: {
    Tables: {
      clinics: {
        Row: { id: number; name: string; number: number; created_at: string };
        Insert: { number: number; name: string };
        Update: { number?: number; name?: string };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          clinic_id: number;
          name: string;
          md_content: string | null;
          key_points: KeyPoint[] | null;
          vision_1st_url: string | null;
          vision_3rd_url: string | null;
          created_at: string;
        };
        Insert: {
          clinic_id: number;
          name: string;
          md_content?: string | null;
          key_points?: KeyPoint[] | null;
          vision_1st_url?: string | null;
          vision_3rd_url?: string | null;
        };
        Update: {
          clinic_id?: number;
          name?: string;
          md_content?: string | null;
          key_points?: KeyPoint[] | null;
          vision_1st_url?: string | null;
          vision_3rd_url?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          student_id: string;
          clinic_id: number;
          day_number: number;
          session_number: number;
          date: string;
          created_at: string;
        };
        Insert: {
          student_id: string;
          clinic_id: number;
          day_number: number;
          session_number: number;
          date?: string;
        };
        Update: {
          day_number?: number;
          session_number?: number;
          date?: string;
        };
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          emotional_state: number;
          environmental_perception: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          student_id: string;
          emotional_state: number;
          environmental_perception: number;
          notes?: string | null;
        };
        Update: {
          emotional_state?: number;
          environmental_perception?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      wave_logs: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          wave_number: number;
          before_notes: string | null;
          during_notes: string | null;
          after_notes: string | null;
          social_notes: string | null;
          is_success: boolean | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          student_id: string;
          wave_number: number;
          before_notes?: string | null;
          during_notes?: string | null;
          after_notes?: string | null;
          social_notes?: string | null;
          is_success?: boolean | null;
        };
        Update: {
          before_notes?: string | null;
          during_notes?: string | null;
          after_notes?: string | null;
          social_notes?: string | null;
          is_success?: boolean | null;
        };
        Relationships: [];
      };
      daily_stats: {
        Row: {
          id: string;
          student_id: string;
          session_id: string;
          day_number: number;
          wave_count: number;
          success_count: number;
          bad_count: number;
          created_at: string;
        };
        Insert: {
          student_id: string;
          session_id: string;
          day_number: number;
          wave_count?: number;
          success_count?: number;
          bad_count?: number;
        };
        Update: {
          wave_count?: number;
          success_count?: number;
          bad_count?: number;
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
export type Clinic = Database["rca"]["Tables"]["clinics"]["Row"];
export type Student = Database["rca"]["Tables"]["students"]["Row"];
export type Session = Database["rca"]["Tables"]["sessions"]["Row"];
export type CheckIn = Database["rca"]["Tables"]["check_ins"]["Row"];
export type WaveLog = Database["rca"]["Tables"]["wave_logs"]["Row"];
export type DailyStat = Database["rca"]["Tables"]["daily_stats"]["Row"];
