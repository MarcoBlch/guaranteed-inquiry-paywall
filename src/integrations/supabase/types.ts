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
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string | null
          description: string | null
          escrow_transaction_id: string | null
          id: string
          message_response_id: string | null
          metadata: Json | null
          notes: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string | null
          description?: string | null
          escrow_transaction_id?: string | null
          id?: string
          message_response_id?: string | null
          metadata?: Json | null
          notes?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string | null
          description?: string | null
          escrow_transaction_id?: string | null
          id?: string
          message_response_id?: string | null
          metadata?: Json | null
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
          bounced_at: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          email_provider_id: string | null
          email_service_provider: string | null
          email_type: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          response_detected_at: string | null
          sender_email: string
          sent_at: string
          spam_at: string | null
          updated_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_provider_id?: string | null
          email_service_provider?: string | null
          email_type: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          response_detected_at?: string | null
          sender_email: string
          sent_at?: string
          spam_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email_provider_id?: string | null
          email_service_provider?: string | null
          email_type?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          response_detected_at?: string | null
          sender_email?: string
          sent_at?: string
          spam_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message_email_status"
            referencedColumns: ["message_id"]
          },
          {
            foreignKeyName: "email_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_response_tracking: {
        Row: {
          created_at: string
          email_headers: Json | null
          grace_period_used: boolean
          id: string
          inbound_email_id: string | null
          message_id: string
          metadata: Json | null
          original_email_id: string
          quality_notes: string | null
          quality_score: number | null
          response_content_preview: string | null
          response_detected_method: string
          response_email_from: string | null
          response_email_subject: string | null
          response_received_at: string
          within_deadline: boolean
        }
        Insert: {
          created_at?: string
          email_headers?: Json | null
          grace_period_used?: boolean
          id?: string
          inbound_email_id?: string | null
          message_id: string
          metadata?: Json | null
          original_email_id: string
          quality_notes?: string | null
          quality_score?: number | null
          response_content_preview?: string | null
          response_detected_method: string
          response_email_from?: string | null
          response_email_subject?: string | null
          response_received_at: string
          within_deadline?: boolean
        }
        Update: {
          created_at?: string
          email_headers?: Json | null
          grace_period_used?: boolean
          id?: string
          inbound_email_id?: string | null
          message_id?: string
          metadata?: Json | null
          original_email_id?: string
          quality_notes?: string | null
          quality_score?: number | null
          response_content_preview?: string | null
          response_detected_method?: string
          response_email_from?: string | null
          response_email_subject?: string | null
          response_received_at?: string
          within_deadline?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_response_tracking_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message_email_status"
            referencedColumns: ["message_id"]
          },
          {
            foreignKeyName: "email_response_tracking_message_id_fkey"
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
            referencedRelation: "message_email_status"
            referencedColumns: ["message_id"]
          },
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
            referencedRelation: "message_email_status"
            referencedColumns: ["message_id"]
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
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          id: string
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          id?: string
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      email_service_stats: {
        Row: {
          bounced: number | null
          clicked: number | null
          delivered: number | null
          delivery_rate: number | null
          email_service_provider: string | null
          failed: number | null
          failure_rate: number | null
          open_rate: number | null
          opened: number | null
          spam: number | null
          total_sent: number | null
        }
        Relationships: []
      }
      email_stats: {
        Row: {
          clicked: number | null
          delivered: number | null
          delivery_rate: number | null
          email_type: string | null
          failed: number | null
          open_rate: number | null
          opened: number | null
          total_sent: number | null
        }
        Relationships: []
      }
      message_email_status: {
        Row: {
          any_delivered: boolean | null
          any_failed: boolean | null
          any_opened: boolean | null
          emails_sent: number | null
          last_email_sent: string | null
          message_id: string | null
          recipient_user_id: string | null
          sender_email: string | null
        }
        Relationships: []
      }
      response_tracking_stats: {
        Row: {
          avg_quality_score: number | null
          grace_period_responses: number | null
          manually_marked: number | null
          on_time_percentage: number | null
          on_time_responses: number | null
          total_responses: number | null
          webhook_detected: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_expiration_time: {
        Args: { message_id: string }
        Returns: string
      }
      check_my_admin_status: {
        Args: never
        Returns: {
          is_admin_function: boolean
          is_admin_in_db: boolean
          session_authenticated: boolean
          user_email: string
          user_id: string
        }[]
      }
      clean_old_email_logs: { Args: { days_to_keep?: number }; Returns: number }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      get_current_user_email: { Args: never; Returns: string }
      get_current_user_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_valid_email: { Args: { email_text: string }; Returns: boolean }
      is_verified_admin: { Args: never; Returns: boolean }
      sanitize_text: { Args: { input_text: string }; Returns: string }
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
A new version of Supabase CLI is available: v2.62.10 (currently installed v2.62.5)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
