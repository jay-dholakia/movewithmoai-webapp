export interface FocusMoaiRef {
  id: string;
  name: string;
  status: string;
}

export interface UserRef {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

export interface ProgramAssignmentRow {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  difficulty_level: string | null;
  is_paid: boolean;
  is_deprecated: boolean | null;
  days_per_week: number;
  created_at: string | null;
  scoped_focus_moai: FocusMoaiRef | null;
  scoped_user: UserRef | null;
  focus_moais_via_workout_focus: FocusMoaiRef[];
  assigned_users: UserRef[];
}

export interface AssignmentStats {
  total_programs: number;
  programs_with_any_assignment: number;
  total_focus_moais_assigned: number;
  total_users_assigned: number;
}
