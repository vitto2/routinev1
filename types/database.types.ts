// Escrito à mão para refletir supabase/migrations/0001_init.sql.
// Quando o projeto Supabase estiver provisionado, substitua por:
//   npx supabase gen types typescript --project-id <id> > types/database.types.ts

export type HabitType = "build" | "avoid";
export type TrackingType = "checkbox" | "quantity" | "time";
export type ScheduleType =
  | "daily"
  | "weekdays"
  | "x_per_week"
  | "specific_date"
  | "interval";
export type TaskPriority = "low" | "medium" | "high";
export type RoutinePeriod = "morning" | "afternoon" | "evening" | "custom";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          timezone: string;
          created_at: string;
          onboarded_at: string | null;
          last_digest_date: string | null;
          last_evening_date: string | null;
          last_review_date: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          timezone?: string;
          created_at?: string;
          onboarded_at?: string | null;
          last_digest_date?: string | null;
          last_evening_date?: string | null;
          last_review_date?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          timezone?: string;
          created_at?: string;
          onboarded_at?: string | null;
          last_digest_date?: string | null;
          last_evening_date?: string | null;
          last_review_date?: string | null;
        };
        Relationships: [];
      };
      pillars: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          color: string | null;
          description: string | null;
          sort_order: number;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          description?: string | null;
          sort_order?: number;
          archived?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pillars"]["Insert"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          pillar_id: string | null;
          name: string;
          description: string | null;
          habit_type: HabitType;
          tracking_type: TrackingType;
          target_value: number | null;
          target_unit: string | null;
          icon: string | null;
          color: string | null;
          active: boolean;
          archived_at: string | null;
          sort_order: number;
          reminder_time: string | null;
          last_reminded_date: string | null;
          challenge_days: number | null;
          challenge_start_date: string | null;
          routine_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pillar_id?: string | null;
          name: string;
          description?: string | null;
          habit_type: HabitType;
          tracking_type: TrackingType;
          target_value?: number | null;
          target_unit?: string | null;
          icon?: string | null;
          color?: string | null;
          active?: boolean;
          archived_at?: string | null;
          sort_order?: number;
          reminder_time?: string | null;
          last_reminded_date?: string | null;
          challenge_days?: number | null;
          challenge_start_date?: string | null;
          routine_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Insert"]>;
        Relationships: [];
      };
      habit_schedules: {
        Row: {
          id: string;
          habit_id: string;
          schedule_type: ScheduleType;
          weekdays: number[] | null;
          frequency_target: number | null;
          interval_days: number | null;
          specific_date: string | null;
          start_date: string;
          end_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          schedule_type: ScheduleType;
          weekdays?: number[] | null;
          frequency_target?: number | null;
          interval_days?: number | null;
          specific_date?: string | null;
          start_date?: string;
          end_date?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["habit_schedules"]["Insert"]
        >;
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          value: number | null;
          completed: boolean;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          value?: number | null;
          completed?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["habit_logs"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          pillar_id: string | null;
          title: string;
          description: string | null;
          due_date: string;
          due_time: string | null;
          priority: TaskPriority;
          completed: boolean;
          completed_at: string | null;
          reminded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pillar_id?: string | null;
          title: string;
          description?: string | null;
          due_date: string;
          due_time?: string | null;
          priority?: TaskPriority;
          completed?: boolean;
          completed_at?: string | null;
          reminded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          period: RoutinePeriod;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          period?: RoutinePeriod;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["routines"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["push_subscriptions"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
