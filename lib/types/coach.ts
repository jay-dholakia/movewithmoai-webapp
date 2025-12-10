// Coach dashboard types

export interface ClientMetrics {
  user_id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  profile_picture_url: string | null
  user_created_at: string
  coach_id: string | null
  assigned_coach_id: string | null
  subscription_status: string | null
  current_week_commitment: number
  current_week_completed: number
  current_week_completion_rate: number
  current_week_start: string | null
  total_commitment_weeks: number
  total_completed_sessions: number
  total_commitment_count: number
  overall_completion_rate: number
  total_completed_workouts: number
  total_workout_sessions: number
  last_workout_date: string | null
  chat_sessions_count: number
  last_message_at: string | null
  unread_messages_count: number
  notes_count: number
  last_note_updated_at: string | null
  pending_video_reviews: number
}

export interface CommitmentHistory {
  id: string
  user_id: string
  week_start: string
  commitment_count: number
  completed_sessions: number
  completion_rate: number
  created_at: string
  updated_at: string
  user_name: string | null
  username: string | null
}

export interface WorkoutHistory {
  session_id: string
  user_id: string
  workout_template_id: string
  status: string
  started_at: string
  completed_at: string | null
  total_duration_seconds: number
  date: string
  notes: string | null
  rpe: number | null
  user_name: string | null
  username: string | null
  workout_title: string | null
  workout_type: string | null
  total_sets: number
  completed_sets: number
  exercise_count: number
}

export interface ExercisePerformance {
  exercise_name: string
  workout_session_id: string
  user_id: string
  workout_date: string
  sets_completed: number
  avg_reps: number
  avg_weight_lbs: number
  max_reps: number
  max_weight_lbs: number
  total_volume: number
  user_name: string | null
  username: string | null
}

export interface CoachProfile {
  id: string
  user_id: string | null
  name: string
  email: string
  first_name: string
  last_name: string | null
  specializations: string[]
  bio: string | null
  is_available: boolean
  profile_image_url: string | null
  current_clients: number
  max_clients: number
}

export interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  username: string | null
  profile_picture_url: string | null
  birthdate: string | null
  gender: string | null
  height_inches: number | null
  weight_kg: number | null
  experience_level: string | null
  fitness_goal: string | null
  equipment: string[] | null
  injury_history: string[] | null
  city: string | null
  country: string | null
  created_at: string
}

export interface WorkoutPlan {
  plan_id: string
  plan_name: string
  assigned_at: string
  workouts: WorkoutInPlan[]
  total_workouts: number
  completed_workouts: number
  completion_rate: number
}

export interface WorkoutInPlan {
  workout_id: string
  workout_title: string
  workout_type: string
  assigned_at: string
  completed_at: string | null
  status: 'completed' | 'assigned' | 'not_started'
  workout_session_id: string | null
}

export interface PersonalBest {
  exercise_name: string
  exercise_id: string
  max_weight_lbs: number | null
  max_reps: number | null
  max_volume: number | null
  achieved_at: string
  workout_session_id: string
}

