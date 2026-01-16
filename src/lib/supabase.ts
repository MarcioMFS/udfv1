import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      class_players: {
        Row: {
          avg_score: number | null
          class_id: string | null
          id: string
          joined_at: string | null
          player_id: string | null
          total_matches: number | null
        }
        Insert: {
          avg_score?: number | null
          class_id?: string | null
          id?: string
          joined_at?: string | null
          player_id?: string | null
          total_matches?: number | null
        }
        Update: {
          avg_score?: number | null
          class_id?: string | null
          id?: string
          joined_at?: string | null
          player_id?: string | null
          total_matches?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "class_players_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          end_date: string | null
          event_id: string | null
          event_type: string | null
          id: string
          influencer_id: string | null
          instructor_id: string | null
          schedule: Json[] | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          influencer_id?: string | null
          instructor_id?: string | null
          schedule?: Json[] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          influencer_id?: string | null
          instructor_id?: string | null
          schedule?: Json[] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          end_date: string | null
          event_id_legacy: string | null
          id: string
          instructions: string | null
          instructor_id: string | null
          max_players: number | null
          name: string | null
          start_date: string | null
          subject: string | null
          time_limit: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          end_date?: string | null
          event_id_legacy?: string | null
          id?: string
          instructions?: string | null
          instructor_id?: string | null
          max_players?: number | null
          name?: string | null
          start_date?: string | null
          subject?: string | null
          time_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          end_date?: string | null
          event_id_legacy?: string | null
          id?: string
          instructions?: string | null
          instructor_id?: string | null
          max_players?: number | null
          name?: string | null
          start_date?: string | null
          subject?: string | null
          time_limit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          udf_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          udf_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          udf_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      instructors: {
        Row: {
          app_id: string | null
          created_at: string | null
          email: string | null
          external_id: string | null
          id: string
          name: string | null
          udf_id: string | null
          updated_at: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          name?: string | null
          udf_id?: string | null
          updated_at?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          name?: string | null
          udf_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      match_results: {
        Row: {
          bonus: number | null
          class_id: string
          created_at: string | null
          lucro: number | null
          match_number: number
          player_id: string
          satisfacao: number | null
          updated_at: string | null
        }
        Insert: {
          bonus?: number | null
          class_id: string
          created_at?: string | null
          lucro?: number | null
          match_number: number
          player_id: string
          satisfacao?: number | null
          updated_at?: string | null
        }
        Update: {
          bonus?: number | null
          class_id?: string
          created_at?: string | null
          lucro?: number | null
          match_number?: number
          player_id?: string
          satisfacao?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          app_serial: string
          class_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          match_date: string
          match_number: number | null
          player_id: string | null
        }
        Insert: {
          app_serial: string
          class_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          match_date: string
          match_number?: number | null
          player_id?: string | null
        }
        Update: {
          app_serial?: string
          class_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          match_date?: string
          match_number?: number | null
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          device_indentifier: string | null
          email: string | null
          id: string
          name: string | null
          purpose: Database["public"]["Enums"]["purpose_enum"] | null
          registration_number: string | null
          team_id: number | null
          udf_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_indentifier?: string | null
          email?: string | null
          id?: string
          name?: string | null
          purpose?: Database["public"]["Enums"]["purpose_enum"] | null
          registration_number?: string | null
          team_id?: number | null
          udf_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_indentifier?: string | null
          email?: string | null
          id?: string
          name?: string | null
          purpose?: Database["public"]["Enums"]["purpose_enum"] | null
          registration_number?: string | null
          team_id?: number | null
          udf_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          group_purpose: Database["public"]["Enums"]["purpose_enum"] | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_purpose?: Database["public"]["Enums"]["purpose_enum"] | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_purpose?: Database["public"]["Enums"]["purpose_enum"] | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_type_enum: "training" | "group"
      purpose_enum: "lucro" | "satisfacao" | "bonus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof PublicSchema["CompositeTypes"] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_type_enum: ["training", "group"],
      purpose_enum: ["lucro", "satisfacao", "bonus"],
    },
  },
} as const
