export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      fantasy_leagues: {
        Row: {
          budget: number
          competition: string
          created_at: string
          id: string
          invite_code: string
          is_active: boolean
          max_members: number
          name: string
          owner_id: string
        }
        Insert: {
          budget?: number
          competition?: string
          created_at?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          max_members?: number
          name: string
          owner_id: string
        }
        Update: {
          budget?: number
          competition?: string
          created_at?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          max_members?: number
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          remaining_budget: number
          total_points: number
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          remaining_budget?: number
          total_points?: number
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          remaining_budget?: number
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "fantasy_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          ask_price: number
          expires_at: string | null
          id: string
          is_active: boolean
          league_id: string
          listed_at: string
          player_id: string
          seller_id: string | null
        }
        Insert: {
          ask_price: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          league_id: string
          listed_at?: string
          player_id: string
          seller_id?: string | null
        }
        Update: {
          ask_price?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          league_id?: string
          listed_at?: string
          player_id?: string
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "fantasy_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          league: string
          scheduled_at: string
          season: number | null
          split: string | null
          status: Database["public"]["Enums"]["match_status"]
          team_away: string
          team_home: string
          week: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          league?: string
          scheduled_at: string
          season?: number | null
          split?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_away: string
          team_home: string
          week?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          league?: string
          scheduled_at?: string
          season?: number | null
          split?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_away?: string
          team_home?: string
          week?: number | null
        }
        Relationships: []
      }
      player_match_stats: {
        Row: {
          assists: number
          bans_effective: number | null
          created_at: string
          cs_per_min: number
          damage_share: number | null
          deaths: number
          double_kill: boolean
          gold_diff_15: number | null
          id: string
          kills: number
          match_id: string
          match_points: number | null
          objective_steals: number
          penta_kill: boolean
          picks_correct: number | null
          player_id: string
          quadra_kill: boolean
          triple_kill: boolean
          vision_score: number | null
        }
        Insert: {
          assists?: number
          bans_effective?: number | null
          created_at?: string
          cs_per_min?: number
          damage_share?: number | null
          deaths?: number
          double_kill?: boolean
          gold_diff_15?: number | null
          id?: string
          kills?: number
          match_id: string
          match_points?: number | null
          objective_steals?: number
          penta_kill?: boolean
          picks_correct?: number | null
          player_id: string
          quadra_kill?: boolean
          triple_kill?: boolean
          vision_score?: number | null
        }
        Update: {
          assists?: number
          bans_effective?: number | null
          created_at?: string
          cs_per_min?: number
          damage_share?: number | null
          deaths?: number
          double_kill?: boolean
          gold_diff_15?: number | null
          id?: string
          kills?: number
          match_id?: string
          match_points?: number | null
          objective_steals?: number
          penta_kill?: boolean
          picks_correct?: number | null
          player_id?: string
          quadra_kill?: boolean
          triple_kill?: boolean
          vision_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          current_price: number
          id: string
          image_url: string | null
          is_active: boolean
          league: string
          name: string
          price_history: Json
          role: Database["public"]["Enums"]["player_role"]
          team: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_price: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          league?: string
          name: string
          price_history?: Json
          role: Database["public"]["Enums"]["player_role"]
          team: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          league?: string
          name?: string
          price_history?: Json
          role?: Database["public"]["Enums"]["player_role"]
          team?: string
          updated_at?: string
        }
        Relationships: []
      }
      roster_players: {
        Row: {
          added_at: string
          id: string
          player_id: string
          price_paid: number
          roster_id: string
          slot: string
        }
        Insert: {
          added_at?: string
          id?: string
          player_id: string
          price_paid: number
          roster_id: string
          slot: string
        }
        Update: {
          added_at?: string
          id?: string
          player_id?: string
          price_paid?: number
          roster_id?: string
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_players_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          created_at: string
          id: string
          member_id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rosters_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          buyer_id: string | null
          executed_at: string
          id: string
          league_id: string
          player_id: string
          price: number
          seller_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          buyer_id?: string | null
          executed_at?: string
          id?: string
          league_id: string
          player_id: string
          price: number
          seller_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          buyer_id?: string | null
          executed_at?: string
          id?: string
          league_id?: string
          player_id?: string
          price?: number
          seller_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "league_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "fantasy_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "league_members"
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
      match_status: "scheduled" | "live" | "finished"
      player_role: "top" | "jungle" | "mid" | "adc" | "support" | "coach"
      transaction_type: "buy" | "sell"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_status: ["scheduled", "live", "finished"],
      player_role: ["top", "jungle", "mid", "adc", "support", "coach"],
      transaction_type: ["buy", "sell"],
    },
  },
} as const
