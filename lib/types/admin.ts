// Admin portal types

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  totalCoaches: number
  activeCoaches: number
  totalMoais: number
  activeMoais: number
  totalSubscriptions: number
  activeSubscriptions: number
  totalWorkoutSessions: number
  completedWorkoutSessions: number
  averageCompletionRate: number
  totalCommitted: number
  totalCompleted: number
}

export interface AdminUser {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  role: 'user' | 'coach' | 'admin'
  created_at: string
  last_login_at: string | null
  subscription_status: string | null
  total_workouts: number
  total_moais: number
  city: string | null
  country: string | null
  invite_code: string | null
  referrals_count: number
}

export interface AdminCoach {
  id: string
  user_id: string | null
  name: string
  email: string
  first_name: string
  last_name: string | null
  is_available: boolean
  current_clients: number
  max_clients: number
  current_moais: number
  max_moais: number
  created_at: string
  profile_image_url: string | null
}

export interface AdminCoachWithStatus extends AdminCoach {
  signup_confirmed: boolean
}

export interface AdminMoai {
  id: string
  name: string
  status: 'forming' | 'active' | 'inactive'
  created_by_user_id: string
  created_at: string
  activated_at: string | null
  member_count: number
  min_members: number
  has_coach: boolean
  coach_id: string | null
}

export interface LoginActivity {
  user_id: string
  email: string
  username: string | null
  last_login: string | null
  login_count: number
  days_since_last_login: number | null
}

export interface MoaiMember {
  user_id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  profile_picture_url: string | null
  joined_at: string
  status: string
  current_week_commitment: number
  current_week_completed: number
  current_week_completion_rate: number
  total_commitment_weeks: number
  total_completed_sessions: number
  overall_completion_rate: number
  total_workouts: number
}

export interface MoaiDetail {
  id: string
  name: string
  status: 'forming' | 'active' | 'inactive'
  created_by_user_id: string
  created_by_name: string | null
  created_at: string
  activated_at: string | null
  min_members: number
  member_count: number
  has_coach: boolean
  coach_id: string | null
  coach_name: string | null
  members: MoaiMember[]
  moai_commitment_history: Array<{
    week_start: string
    total_commitment: number
    total_completed: number
    completion_rate: number
    member_count: number
  }>
  moai_workout_stats: {
    total_workouts: number
    completed_workouts: number
    total_sessions: number
    completed_sessions: number
    average_completion_rate: number
  }
  weeks_active: number
}

