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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      claims: {
        Row: {
          claimed_at: string
          claimed_by: string
          completed_at: string | null
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          pickup_scheduled_at: string | null
          pickup_time: string | null
          quantity_booked: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          claimed_at?: string
          claimed_by: string
          completed_at?: string | null
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          pickup_scheduled_at?: string | null
          pickup_time?: string | null
          quantity_booked?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          claimed_at?: string
          claimed_by?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          pickup_scheduled_at?: string | null
          pickup_time?: string | null
          quantity_booked?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      food_listings: {
        Row: {
          category: Database["public"]["Enums"]["food_category"]
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          description: string
          donor_id: string
          expiry_date: string
          id: string
          image_url: string | null
          images: string[] | null
          is_urgent: boolean | null
          name: string
          pickup_location: string
          pickup_slots: Json | null
          pickup_time_end: string
          pickup_time_start: string
          quantity: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["food_category"]
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          donor_id: string
          expiry_date: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_urgent?: boolean | null
          name: string
          pickup_location: string
          pickup_slots?: Json | null
          pickup_time_end: string
          pickup_time_start: string
          quantity: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["food_category"]
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          donor_id?: string
          expiry_date?: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_urgent?: boolean | null
          name?: string
          pickup_location?: string
          pickup_slots?: Json | null
          pickup_time_end?: string
          pickup_time_start?: string
          quantity?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          message: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "food_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stats: {
        Row: {
          id: string
          total_food_saved_kg: number
          total_meals_served: number
          total_ngos_onboarded: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_food_saved_kg?: number
          total_meals_served?: number
          total_ngos_onboarded?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_food_saved_kg?: number
          total_meals_served?: number
          total_ngos_onboarded?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          location: string | null
          organization_name: string | null
          phone: string | null
          postal_code: string | null
          role: Database["public"]["Enums"]["user_role"]
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          id?: string
          location?: string | null
          organization_name?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          location?: string | null
          organization_name?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_impact: {
        Row: {
          food_wasted_kg: number
          id: string
          meals_donated: number
          meals_received: number
          updated_at: string
          user_id: string
        }
        Insert: {
          food_wasted_kg?: number
          id?: string
          meals_donated?: number
          meals_received?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          food_wasted_kg?: number
          id?: string
          meals_donated?: number
          meals_received?: number
          updated_at?: string
          user_id?: string
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
      booking_status: "pending" | "collected" | "cancelled"
      food_category:
        | "veg"
        | "non_veg"
        | "dairy"
        | "bakery"
        | "packaged"
        | "cooked"
        | "other"
      listing_status: "available" | "booked" | "expired" | "completed"
      notification_type:
        | "new_listing"
        | "listing_claimed"
        | "pickup_scheduled"
        | "pickup_completed"
        | "listing_expired"
        | "expiry_reminder"
      user_role: "user" | "admin"
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
      booking_status: ["pending", "collected", "cancelled"],
      food_category: [
        "veg",
        "non_veg",
        "dairy",
        "bakery",
        "packaged",
        "cooked",
        "other",
      ],
      listing_status: ["available", "booked", "expired", "completed"],
      notification_type: [
        "new_listing",
        "listing_claimed",
        "pickup_scheduled",
        "pickup_completed",
        "listing_expired",
        "expiry_reminder",
      ],
      user_role: ["user", "admin"],
    },
  },
} as const
