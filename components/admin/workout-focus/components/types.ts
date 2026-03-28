export interface WorkoutProgram {
  id: string;
  plan_name: string;
}

export interface WorkoutFocus {
  id: string;
  name: string;
  description: string | null;
  workout_program_id: string | null;
  created_at: string;
  workout_programs?: { plan_name: string } | null;
}

export interface FocusForm {
  name: string;
  description: string;
  workout_program_id: string;
}

export const EMPTY_FORM: FocusForm = {
  name: "",
  description: "",
  workout_program_id: "",
};

export const PROGRAMS_PAGE_SIZE = 10;
