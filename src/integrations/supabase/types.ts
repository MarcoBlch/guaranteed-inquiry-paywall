export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string | null
          escrow_transaction_id: string | null
          id: string
          message_response_id: string | null
          notes: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string | null
          escrow_transaction_id?: string | null
          id?: string
          message_response_id?: string | null
          notes?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string | null
          escrow_transaction_id?: string | null
          id?: string
          message_response_id?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_message_response_id_fkey"
            columns: ["message_response_id"]
            isOneToOne: false
            referencedRelation: "message_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      "Allow insert if user matches": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_provider_id: string | null
          email_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          sender_email: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          email_provider_id?: string | null
          email_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          sender_email: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          email_provider_id?: string | null
          email_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          sender_email?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          message_id: string | null
          recipient_user_id: string | null
          sender_email: string
          status: string | null
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          recipient_user_id?: string | null
          sender_email: string
          status?: string | null
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          recipient_user_id?: string | null
          sender_email?: string
          status?: string | null
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_responses: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email_thread_id: string | null
          escrow_transaction_id: string | null
          has_response: boolean | null
          id: string
          message_id: string | null
          response_received_at: string | null
          updated_at: string | null
          validated_at: string | null
          validated_by_admin: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email_thread_id?: string | null
          escrow_transaction_id?: string | null
          has_response?: boolean | null
          id?: string
          message_id?: string | null
          response_received_at?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by_admin?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email_thread_id?: string | null
          escrow_transaction_id?: string | null
          has_response?: boolean | null
          id?: string
          message_id?: string | null
          response_received_at?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "message_responses_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_responses_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          amount_paid: number
          attachments: string[] | null
          content: string
          created_at: string | null
          id: string
          notification_sent: boolean | null
          read: boolean | null
          response_deadline_hours: number | null
          sender_email: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          attachments?: string[] | null
          content: string
          created_at?: string | null
          id?: string
          notification_sent?: boolean | null
          read?: boolean | null
          response_deadline_hours?: number | null
          sender_email: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          attachments?: string[] | null
          content?: string
          created_at?: string | null
          id?: string
          notification_sent?: boolean | null
          read?: boolean | null
          response_deadline_hours?: number | null
          sender_email?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          deadline_hours: number
          id: string
          is_active: boolean | null
          price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deadline_hours: number
          id?: string
          is_active?: boolean | null
          price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deadline_hours?: number
          id?: string
          is_active?: boolean | null
          price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          price: number | null
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_admin?: boolean | null
          price?: number | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          price?: number | null
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_audit: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_expiration_time: {
        Args: { message_id: string }
        Returns: string
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_email: {
        Args: { email_text: string }
        Returns: boolean
      }
      sanitize_text: {
        Args: { input_text: string }
        Returns: string
      }
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
