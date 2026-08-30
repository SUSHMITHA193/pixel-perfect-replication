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
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actions: Json
          animal_id: string
          anomaly: boolean
          created_at: string
          id: string
          prediction_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_category: Database["public"]["Enums"]["risk_category"]
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actions?: Json
          animal_id: string
          anomaly?: boolean
          created_at?: string
          id?: string
          prediction_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_category: Database["public"]["Enums"]["risk_category"]
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actions?: Json
          animal_id?: string
          anomaly?: boolean
          created_at?: string
          id?: string
          prediction_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_category?: Database["public"]["Enums"]["risk_category"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          age: number
          breed: string
          collar_device_id: string | null
          created_at: string
          disease_history: Json
          farm_id: string
          id: string
          lactation_number: number
          name: string
          tag: string
          updated_at: string
          vaccination_status: boolean
        }
        Insert: {
          age?: number
          breed: string
          collar_device_id?: string | null
          created_at?: string
          disease_history?: Json
          farm_id: string
          id?: string
          lactation_number?: number
          name: string
          tag: string
          updated_at?: string
          vaccination_status?: boolean
        }
        Update: {
          age?: number
          breed?: string
          collar_device_id?: string | null
          created_at?: string
          disease_history?: Json
          farm_id?: string
          id?: string
          lactation_number?: number
          name?: string
          tag?: string
          updated_at?: string
          vaccination_status?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "animals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      cooperatives: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          cooperative_id: string
          created_at: string
          district: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          name: string
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          district: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          name: string
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          district?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_api_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key_hash: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key_hash: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key_hash?: string
          name?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          animal_id: string
          anomaly_flag: boolean
          anomaly_reason: string | null
          forecast_series: Json
          id: string
          model_version: string
          predicted_at: string
          risk_category: Database["public"]["Enums"]["risk_category"]
          risk_factors: Json
          risk_score: number
        }
        Insert: {
          animal_id: string
          anomaly_flag?: boolean
          anomaly_reason?: string | null
          forecast_series?: Json
          id?: string
          model_version: string
          predicted_at?: string
          risk_category: Database["public"]["Enums"]["risk_category"]
          risk_factors?: Json
          risk_score: number
        }
        Update: {
          animal_id?: string
          anomaly_flag?: boolean
          anomaly_reason?: string | null
          forecast_series?: Json
          id?: string
          model_version?: string
          predicted_at?: string
          risk_category?: Database["public"]["Enums"]["risk_category"]
          risk_factors?: Json
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cooperative_id: string | null
          created_at: string
          farm_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          cooperative_id?: string | null
          created_at?: string
          farm_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          cooperative_id?: string | null
          created_at?: string
          farm_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_readings: {
        Row: {
          activity_level: number | null
          animal_id: string
          battery_level: number | null
          body_temperature: number | null
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          milk_yield: number | null
          rumination_minutes: number | null
          scc: number | null
          source: Database["public"]["Enums"]["reading_source"]
          timestamp: string
        }
        Insert: {
          activity_level?: number | null
          animal_id: string
          battery_level?: number | null
          body_temperature?: number | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          milk_yield?: number | null
          rumination_minutes?: number | null
          scc?: number | null
          source?: Database["public"]["Enums"]["reading_source"]
          timestamp?: string
        }
        Update: {
          activity_level?: number | null
          animal_id?: string
          battery_level?: number | null
          body_temperature?: number | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          milk_yield?: number | null
          rumination_minutes?: number | null
          scc?: number | null
          source?: Database["public"]["Enums"]["reading_source"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_records: {
        Row: {
          animal_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          record_type: string
          recorded_at: string
          value: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          record_type: string
          recorded_at?: string
          value?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          record_type?: string
          recorded_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vet_farm_assignments: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          vet_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          vet_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_farm_assignments_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_recommendations: {
        Row: {
          animal_id: string | null
          created_at: string
          created_by: string | null
          domain: string
          id: string
          source: string
          text: string
          updated_at: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          source?: string
          text: string
          updated_at?: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          source?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_recommendations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_animal: {
        Args: { _animal_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_farm: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_animal: {
        Args: { _animal_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_farm: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "farmer" | "veterinarian" | "coop_admin" | "authority"
      reading_source: "collar" | "manual" | "csv_import"
      risk_category: "No Risk" | "Low" | "Moderate" | "High"
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
      app_role: ["farmer", "veterinarian", "coop_admin", "authority"],
      reading_source: ["collar", "manual", "csv_import"],
      risk_category: ["No Risk", "Low", "Moderate", "High"],
    },
  },
} as const
