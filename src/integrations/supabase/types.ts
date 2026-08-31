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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      compliance_checklist: {
        Row: {
          category: Database["public"]["Enums"]["checklist_category"]
          id: string
          item_name: string
          points: number
          sort_order: number
        }
        Insert: {
          category: Database["public"]["Enums"]["checklist_category"]
          id?: string
          item_name: string
          points?: number
          sort_order?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["checklist_category"]
          id?: string
          item_name?: string
          points?: number
          sort_order?: number
        }
        Relationships: []
      }
      evaluation_results: {
        Row: {
          checklist_id: string
          evaluation_id: string
          id: string
          photo_url: string | null
          score: number
          status: Database["public"]["Enums"]["item_status"]
        }
        Insert: {
          checklist_id: string
          evaluation_id: string
          id?: string
          photo_url?: string | null
          score?: number
          status: Database["public"]["Enums"]["item_status"]
        }
        Update: {
          checklist_id?: string
          evaluation_id?: string
          id?: string
          photo_url?: string | null
          score?: number
          status?: Database["public"]["Enums"]["item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "compliance_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_results_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          approved: boolean
          compliance_status: Database["public"]["Enums"]["compliance_status"]
          created_at: string
          evaluation_date: string
          evaluator_id: string | null
          follow_up_completed: boolean
          follow_up_date: string | null
          household_id: string
          id: string
          max_score: number
          remarks: string | null
          total_score: number
        }
        Insert: {
          approved?: boolean
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          evaluation_date?: string
          evaluator_id?: string | null
          follow_up_completed?: boolean
          follow_up_date?: string | null
          household_id: string
          id?: string
          max_score?: number
          remarks?: string | null
          total_score?: number
        }
        Update: {
          approved?: boolean
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          evaluation_date?: string
          evaluator_id?: string | null
          follow_up_completed?: boolean
          follow_up_date?: string | null
          household_id?: string
          id?: string
          max_score?: number
          remarks?: string | null
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address: string
          archived: boolean
          contact_number: string | null
          created_at: string
          head_of_family: string
          household_number: string
          id: string
          purok: string
          total_members: number
        }
        Insert: {
          address: string
          archived?: boolean
          contact_number?: string | null
          created_at?: string
          head_of_family: string
          household_number: string
          id?: string
          purok: string
          total_members?: number
        }
        Update: {
          address?: string
          archived?: boolean
          contact_number?: string | null
          created_at?: string
          head_of_family?: string
          household_number?: string
          id?: string
          purok?: string
          total_members?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          status: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          status?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          status?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "bhw" | "viewer"
      checklist_category:
        | "waste_segregation"
        | "sanitation"
        | "gardening"
        | "ordinance"
      compliance_status: "compliant" | "partially_compliant" | "non_compliant"
      item_status: "compliant" | "partially_compliant" | "non_compliant"
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
      app_role: ["admin", "bhw", "viewer"],
      checklist_category: [
        "waste_segregation",
        "sanitation",
        "gardening",
        "ordinance",
      ],
      compliance_status: ["compliant", "partially_compliant", "non_compliant"],
      item_status: ["compliant", "partially_compliant", "non_compliant"],
    },
  },
} as const
