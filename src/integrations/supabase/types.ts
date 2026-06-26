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
      demo_plans_55410: {
        Row: {
          annual_deductible: number
          carrier: string
          created_at: string
          extras: string[]
          highlights: string[]
          id: string
          monthly_premium: number
          moop: number
          name: string
          network_id: string
          pcp_copay: number
          requires_medicaid: boolean
          sort_order: number
          specialist_copay: number
          star_rating: number | null
          summary: string
          type: string
        }
        Insert: {
          annual_deductible?: number
          carrier?: string
          created_at?: string
          extras?: string[]
          highlights?: string[]
          id: string
          monthly_premium: number
          moop: number
          name: string
          network_id: string
          pcp_copay?: number
          requires_medicaid?: boolean
          sort_order?: number
          specialist_copay?: number
          star_rating?: number | null
          summary: string
          type: string
        }
        Update: {
          annual_deductible?: number
          carrier?: string
          created_at?: string
          extras?: string[]
          highlights?: string[]
          id?: string
          monthly_premium?: number
          moop?: number
          name?: string
          network_id?: string
          pcp_copay?: number
          requires_medicaid?: boolean
          sort_order?: number
          specialist_copay?: number
          star_rating?: number | null
          summary?: string
          type?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          accepting_new_patients: boolean
          address: string
          city: string
          created_at: string
          id: string
          languages: string[]
          medicare_assignment: boolean
          name: string
          network_tags: string[]
          phone: string
          specialty: string
          state: string
          zip: string
        }
        Insert: {
          accepting_new_patients?: boolean
          address: string
          city: string
          created_at?: string
          id?: string
          languages?: string[]
          medicare_assignment?: boolean
          name: string
          network_tags?: string[]
          phone: string
          specialty: string
          state: string
          zip: string
        }
        Update: {
          accepting_new_patients?: boolean
          address?: string
          city?: string
          created_at?: string
          id?: string
          languages?: string[]
          medicare_assignment?: boolean
          name?: string
          network_tags?: string[]
          phone?: string
          specialty?: string
          state?: string
          zip?: string
        }
        Relationships: []
      }
      plan_formulary_55410: {
        Row: {
          covered: boolean
          created_at: string
          drug_label: string
          id: string
          notes: string | null
          plan_id: string
          preferred_copay: number | null
          prior_auth: boolean
          quantity_limit: string | null
          rxcui: string
          standard_copay: number | null
          step_therapy: boolean
          tier: number | null
        }
        Insert: {
          covered?: boolean
          created_at?: string
          drug_label: string
          id?: string
          notes?: string | null
          plan_id: string
          preferred_copay?: number | null
          prior_auth?: boolean
          quantity_limit?: string | null
          rxcui: string
          standard_copay?: number | null
          step_therapy?: boolean
          tier?: number | null
        }
        Update: {
          covered?: boolean
          created_at?: string
          drug_label?: string
          id?: string
          notes?: string | null
          plan_id?: string
          preferred_copay?: number | null
          prior_auth?: boolean
          quantity_limit?: string | null
          rxcui?: string
          standard_copay?: number | null
          step_therapy?: boolean
          tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_formulary_55410_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "demo_plans_55410"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          annual_deductible: number
          carrier: string
          created_at: string
          dental: boolean
          drug_coverage: boolean
          hearing: boolean
          highlights: string[]
          id: string
          monthly_premium: number
          name: string
          oop_max: number | null
          star_rating: number | null
          summary: string
          type: string
          vision: boolean
        }
        Insert: {
          annual_deductible: number
          carrier: string
          created_at?: string
          dental?: boolean
          drug_coverage?: boolean
          hearing?: boolean
          highlights?: string[]
          id?: string
          monthly_premium: number
          name: string
          oop_max?: number | null
          star_rating?: number | null
          summary: string
          type: string
          vision?: boolean
        }
        Update: {
          annual_deductible?: number
          carrier?: string
          created_at?: string
          dental?: boolean
          drug_coverage?: boolean
          hearing?: boolean
          highlights?: string[]
          id?: string
          monthly_premium?: number
          name?: string
          oop_max?: number | null
          star_rating?: number | null
          summary?: string
          type?: string
          vision?: boolean
        }
        Relationships: []
      }
      providers_55410: {
        Row: {
          address_line1: string | null
          city: string | null
          created_at: string
          credential: string | null
          first_name: string
          id: string
          in_network_plans: string[]
          last_name: string
          npi: string
          phone: string | null
          primary_taxonomy: string | null
          specialty_label: string
          state: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          credential?: string | null
          first_name: string
          id?: string
          in_network_plans?: string[]
          last_name: string
          npi: string
          phone?: string | null
          primary_taxonomy?: string | null
          specialty_label: string
          state?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          credential?: string | null
          first_name?: string
          id?: string
          in_network_plans?: string[]
          last_name?: string
          npi?: string
          phone?: string | null
          primary_taxonomy?: string | null
          specialty_label?: string
          state?: string | null
          zip?: string | null
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
    Enums: {},
  },
} as const
