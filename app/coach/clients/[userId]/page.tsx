'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import { ChatService } from '@/lib/services/chatService'
import type { ClientMetrics, CommitmentHistory, WorkoutHistory, UserProfile, WorkoutPlan, PersonalBest } from '@/lib/types/coach'
import type { ChatMessage, ChatSession } from '@/lib/services/chatService'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Calendar, TrendingUp, Activity, FolderOpen, Trophy, ChevronDown, ChevronRight } from 'lucide-react'

type TabType = 'overview' | 'commitments' | 'workouts' | 'plans' | 'performance' | 'chat'

export default function ClientDetailPage() {
  const params = useParams()
  const userId = params.userId as string

  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [commitmentHistory, setCommitmentHistory] = useState<CommitmentHistory[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([])
  const [plansHistory, setPlansHistory] = useState<WorkoutPlan[]>([])
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [coachId, setCoachId] = useState<string | null>(null)
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadClientData()
  }, [userId])

  const loadClientData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = '/coach/login'
        return
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(session.user.id)
      if (!profile) {
        window.location.href = '/coach'
        return
      }

      setCoachId(profile.id)

      // Load all client data
      const [metrics, userProf, commitments, workouts, plans, bests] = await Promise.all([
        CoachService.getClientMetrics(userId, profile.id),
        CoachService.getUserProfile(userId),
        CoachService.getClientCommitmentHistory(userId, profile.id),
        CoachService.getClientWorkoutHistory(userId, profile.id),
        CoachService.getUserPlansHistory(userId),
        CoachService.getUserPersonalBests(userId),
      ])

      setClientMetrics(metrics)
      setUserProfile(userProf)
      setCommitmentHistory(commitments)
      setWorkoutHistory(workouts)
      setPlansHistory(plans)
      setPersonalBests(bests)
    } catch (error) {
      console.error('Error loading client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlan = (planId: string) => {
    const newExpanded = new Set(expandedPlans)
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId)
    } else {
      newExpanded.add(planId)
    }
    setExpandedPlans(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client data...</p>
        </div>
      </div>
    )
  }

  if (!clientMetrics || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Client not found</p>
          <Link href="/coach" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const clientName = userProfile.first_name && userProfile.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile.username || userProfile.email

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/coach"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{clientName}</h1>
                <p className="text-sm text-gray-600 mt-1">{userProfile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {clientMetrics.unread_messages_count > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  {clientMetrics.unread_messages_count} unread messages
                </span>
              )}
              {clientMetrics.pending_video_reviews > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {clientMetrics.pending_video_reviews} videos pending review
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Profile */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              {/* Profile Picture */}
              <div className="flex justify-center mb-4">
                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {userProfile.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt={clientName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-gray-600 font-medium">
                      {(userProfile.first_name?.[0] || userProfile.email[0]).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name and Basic Info */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{clientName}</h2>
                <p className="text-sm text-gray-500 mt-1">{userProfile.email}</p>
                {userProfile.username && (
                  <p className="text-sm text-gray-500">@{userProfile.username}</p>
                )}
              </div>

              {/* Profile Details */}
              <div className="space-y-4 border-t border-gray-200 pt-4">
                {userProfile.birthdate && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Age</p>
                    <p className="text-sm text-gray-900 mt-1">{calculateAge(userProfile.birthdate)} years</p>
                  </div>
                )}
                {userProfile.gender && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Gender</p>
                    <p className="text-sm text-gray-900 mt-1">{userProfile.gender}</p>
                  </div>
                )}
                {(userProfile.height_inches || userProfile.weight_kg) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Body Metrics</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {userProfile.height_inches && `${userProfile.height_inches}"`}
                      {userProfile.height_inches && userProfile.weight_kg && ' • '}
                      {userProfile.weight_kg && `${userProfile.weight_kg} kg`}
                    </p>
                  </div>
                )}
                {userProfile.experience_level && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Experience</p>
                    <p className="text-sm text-gray-900 mt-1">{userProfile.experience_level}</p>
                  </div>
                )}
                {userProfile.fitness_goal && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Fitness Goal</p>
                    <p className="text-sm text-gray-900 mt-1">{userProfile.fitness_goal}</p>
                  </div>
                )}
                {userProfile.equipment && userProfile.equipment.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Equipment</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userProfile.equipment.map((eq, idx) => (
                        <span key={idx} className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {userProfile.injury_history && userProfile.injury_history.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Injury History</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userProfile.injury_history.map((injury, idx) => (
                        <span key={idx} className="inline-flex px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                          {injury}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(userProfile.city || userProfile.country) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {[userProfile.city, userProfile.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Member Since</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 mb-6">
              <nav className="flex space-x-8 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: Activity },
                  { id: 'commitments', label: 'Commitments', icon: Calendar },
                  { id: 'workouts', label: 'Workouts', icon: TrendingUp },
                  { id: 'plans', label: 'Plans', icon: FolderOpen },
                  { id: 'performance', label: 'Performance', icon: Trophy },
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Current Week</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.current_week_completed}/{clientMetrics.current_week_commitment}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clientMetrics.current_week_completion_rate}% complete
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Overall Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.overall_completion_rate}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clientMetrics.total_completed_sessions}/{clientMetrics.total_commitment_count} sessions
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.total_completed_workouts}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clientMetrics.total_workout_sessions} sessions total
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Commitment Weeks</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.total_commitment_weeks}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Weeks tracked</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Workouts</h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {workoutHistory.slice(0, 5).map((workout) => (
                      <div key={workout.session_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {workout.workout_title || 'Workout'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(workout.date).toLocaleDateString()} • {workout.completed_sets}/{workout.total_sets} sets
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">
                              {workout.status === 'completed' ? '✓ Completed' : workout.status}
                            </p>
                            {workout.total_duration_seconds > 0 && (
                              <p className="text-xs text-gray-500">
                                {Math.floor(workout.total_duration_seconds / 60)} min
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {workoutHistory.length === 0 && (
                      <div className="px-6 py-8 text-center text-gray-500">
                        No workouts yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'commitments' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Commitment History</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commitment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {commitmentHistory.map((commitment) => (
                        <tr key={commitment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(commitment.week_start).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {commitment.commitment_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {commitment.completed_sessions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                commitment.completion_rate >= 100
                                  ? 'bg-green-100 text-green-800'
                                  : commitment.completion_rate >= 75
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {commitment.completion_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {commitmentHistory.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            No commitment history
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'workouts' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Workout History</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {workoutHistory.map((workout) => (
                    <div key={workout.session_id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {workout.workout_title || 'Workout'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(workout.date).toLocaleDateString()} • {workout.exercise_count} exercises • {workout.completed_sets}/{workout.total_sets} sets
                          </p>
                          {workout.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">"{workout.notes}"</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              workout.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : workout.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {workout.status}
                          </span>
                          {workout.total_duration_seconds > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.floor(workout.total_duration_seconds / 60)} min
                            </p>
                          )}
                          {workout.rpe && (
                            <p className="text-xs text-gray-500 mt-1">RPE: {workout.rpe}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {workoutHistory.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No workouts yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Workout Plans History</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {plansHistory.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No workout plans assigned yet
                    </div>
                  ) : (
                    plansHistory.map((plan) => (
                      <div key={plan.plan_id} className="px-6 py-4">
                        <button
                          onClick={() => togglePlan(plan.plan_id)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {expandedPlans.has(plan.plan_id) ? (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              )}
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">{plan.plan_name}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  Assigned {new Date(plan.assigned_at).toLocaleDateString()} • {plan.completed_workouts}/{plan.total_workouts} workouts completed
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{plan.completion_rate}%</p>
                              <p className="text-xs text-gray-500">Complete</p>
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${plan.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        </button>
                        {expandedPlans.has(plan.plan_id) && (
                          <div className="mt-4 ml-8 space-y-2">
                            {plan.workouts.map((workout) => (
                              <div
                                key={workout.workout_id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{workout.workout_title}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {workout.workout_type} • Assigned {new Date(workout.assigned_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {workout.status === 'completed' ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      ✓ Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                      {workout.status === 'assigned' ? 'Assigned' : 'Not Started'}
                                    </span>
                                  )}
                                  {workout.completed_at && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(workout.completed_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Personal Bests</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {personalBests.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No personal bests recorded yet
                    </div>
                  ) : (
                    personalBests.map((best) => (
                      <div key={best.exercise_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{best.exercise_name}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Achieved {new Date(best.achieved_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-6 text-right">
                            {best.max_weight_lbs && (
                              <div>
                                <p className="text-xs text-gray-500">Max Weight</p>
                                <p className="text-sm font-semibold text-gray-900">{best.max_weight_lbs} lbs</p>
                              </div>
                            )}
                            {best.max_reps && (
                              <div>
                                <p className="text-xs text-gray-500">Max Reps</p>
                                <p className="text-sm font-semibold text-gray-900">{best.max_reps}</p>
                              </div>
                            )}
                            {best.max_volume && (
                              <div>
                                <p className="text-xs text-gray-500">Max Volume</p>
                                <p className="text-sm font-semibold text-gray-900">{best.max_volume} lbs</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chat' && coachId && (
              <ChatInterface userId={userId} coachId={coachId} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Chat Interface Component
function ChatInterface({ userId, coachId }: { userId: string; coachId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [session, setSession] = useState<ChatSession | null>(null)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadChat()
  }, [userId, coachId])

  const loadChat = async () => {
    try {
      const chatSession = await ChatService.getChatSession(userId, coachId)
      if (!chatSession) return

      setSession(chatSession)
      const chatMessages = await ChatService.getMessages(chatSession.id)
      setMessages(chatMessages)

      // Mark messages as read
      await ChatService.markMessagesAsRead(chatSession.id, coachId)

      // Subscribe to new messages
      const unsubscribe = ChatService.subscribeToMessages(chatSession.id, (newMessage) => {
        setMessages((prev) => [...prev, newMessage])
        // Auto-mark as read if it's from user
        if (newMessage.sender_type === 'user') {
          ChatService.markMessagesAsRead(chatSession.id, coachId)
        }
      })

      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() || !session || sending) return

    setSending(true)
    try {
      const newMessage = await ChatService.sendMessage(session.id, coachId, inputText.trim())
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage])
        setInputText('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading chat...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_type === 'coach' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender_type === 'coach'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.message}</p>
              <p
                className={`text-xs mt-1 ${
                  message.sender_type === 'coach' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
