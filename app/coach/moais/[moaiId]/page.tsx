'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import { ChatService } from '@/lib/services/chatService'
import type {
  MoaiDetail,
  CoachProfile,
  ClientMetrics,
  CommitmentHistory,
  WorkoutHistory,
  MoaiMemberMetrics,
  ExercisePerformance,
  WorkoutInPlan,
  PersonalBest,
} from '@/lib/types/coach'
import type { MoaiChatMessage, MoaiChat } from '@/lib/services/chatService'
import Link from 'next/link'
import {
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Users,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Calendar,
  Dumbbell,
  BarChart3,
  LogOut,
} from 'lucide-react'

interface TrendAnalysis {
  completionRateTrend: 'up' | 'down' | 'stable'
  completionRateChange: number
  memberEngagementTrend: 'up' | 'down' | 'stable'
  memberEngagementChange: number
  recentWeeks: Array<{
    week_start: string
    completion_rate: number
    member_count: number
  }>
}


export default function MoaiDetailPage() {
  const params = useParams()
  const router = useRouter()
  const moaiId = params.moaiId as string

  const [moaiDetail, setMoaiDetail] = useState<MoaiDetail | null>(null)
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<MoaiChatMessage[]>([])
  const [moaiChat, setMoaiChat] = useState<MoaiChat | null>(null)
  const [chatInputText, setChatInputText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedMember, setSelectedMember] = useState<{
    userId: string
    member: MoaiMemberMetrics
  } | null>(null)
  const [memberDetails, setMemberDetails] = useState<{
    metrics: ClientMetrics | null
    commitmentHistory: CommitmentHistory[]
    workoutHistory: WorkoutHistory[]
    exercisePerformance: ExercisePerformance[]
    weeklyWorkouts: WorkoutInPlan[]
    loading: boolean
  }>({
    metrics: null,
    commitmentHistory: [],
    workoutHistory: [],
    exercisePerformance: [],
    weeklyWorkouts: [],
    loading: false,
  })
  const [activeMemberTab, setActiveMemberTab] = useState<'workouts' | 'progression' | 'program'>('workouts')
  const [selectedWorkout, setSelectedWorkout] = useState<{
    sessionId: string
    workout: WorkoutHistory
  } | null>(null)
  const [workoutDetails, setWorkoutDetails] = useState<{
    session: WorkoutHistory | null
    exercises: Array<{
      exercise_name: string
      sets: Array<{
        id: string
        set_number: number
        weight_lbs: number | null
        reps: number | null
        is_completed: boolean
      }>
    }>
  } | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [workoutTemplateDetails, setWorkoutTemplateDetails] = useState<{
    workoutId: string
    exercises: Array<{
      exercise_name: string
      sets: Array<{
        set_number: number
        target_reps: number | null
        target_weight_lbs: number | null
      }>
    }>
  } | null>(null)
  const [workoutPersonalBests, setWorkoutPersonalBests] = useState<Map<string, PersonalBest>>(new Map())

  useEffect(() => {
    loadMoaiDetail()
  }, [moaiId])

  const loadMoaiDetail = async () => {
    try {
      setLoading(true)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        router.push('/coach/login')
        return
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(session.user.id)
      if (!profile) {
        console.error('No coach profile found for user:', session.user.id)
        router.push('/')
        return
      }

      setCoachProfile(profile)

      // Get Moai detail
      console.log('Fetching Moai detail for:', { moaiId, coachId: profile.id })
      const detail = await CoachService.getMoaiDetail(moaiId, profile.id)
      if (!detail) {
        console.error('Moai detail not found or access denied')
        router.push('/coach/moais')
        return
      }

      console.log('Moai detail loaded successfully:', detail)
      setMoaiDetail(detail)
    } catch (error) {
      console.error('Error loading Moai detail:', error)
      setMoaiDetail(null)
    } finally {
      setLoading(false)
    }
  }

  // Load member details when modal opens
  const loadMemberDetails = async (userId: string) => {
    if (!coachProfile) return

    setMemberDetails({
      metrics: null,
      commitmentHistory: [],
      workoutHistory: [],
      exercisePerformance: [],
      weeklyWorkouts: [],
      loading: true,
    })

    try {
      // Get current week start for weekly workouts (Monday)
      const currentWeekStart = new Date()
      const dayOfWeek = currentWeekStart.getDay() // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday)
      currentWeekStart.setHours(0, 0, 0, 0) // Set to start of day
      
      // Format as YYYY-MM-DD in local time (not UTC)
      const year = currentWeekStart.getFullYear()
      const month = String(currentWeekStart.getMonth() + 1).padStart(2, '0')
      const day = String(currentWeekStart.getDate()).padStart(2, '0')
      const weekStartStr = `${year}-${month}-${day}`

      // Fetch all data, but handle errors gracefully since Moai members might not be direct clients
      const [metricsResult, commitmentHistoryResult, workoutHistoryResult, exercisePerformanceResult, weeklyWorkoutsResult] =
        await Promise.allSettled([
          CoachService.getClientMetrics(userId, coachProfile.id),
          CoachService.getClientCommitmentHistory(userId, coachProfile.id),
          CoachService.getClientWorkoutHistory(userId, coachProfile.id, 20),
          CoachService.getClientExercisePerformance(userId),
          CoachService.getWeeklyAssignedWorkouts(userId, weekStartStr),
        ])

      let metrics =
        metricsResult.status === 'fulfilled' ? metricsResult.value : null

      // If metrics is null (member not a direct client), create metrics from selectedMember.member data
      if (!metrics && selectedMember && selectedMember.member) {
        const member = selectedMember.member
        metrics = {
          user_id: member.user_id,
          email: member.email,
          username: member.username,
          first_name: member.first_name,
          last_name: member.last_name,
          profile_picture_url: member.profile_picture_url,
          user_created_at: member.joined_at,
          coach_id: coachProfile.id,
          assigned_coach_id: null,
          subscription_status: null,
          current_week_commitment: member.current_week_commitment,
          current_week_completed: member.current_week_completed,
          current_week_completion_rate: member.current_week_completion_rate,
          current_week_start: weekStartStr,
          total_commitment_weeks: member.total_commitment_weeks,
          total_completed_sessions: 0, // Not available in member data
          total_commitment_count: 0, // Not available in member data
          overall_completion_rate: member.overall_completion_rate,
          total_completed_workouts: member.total_workouts,
          total_workout_sessions: member.total_workouts,
          last_workout_date: null,
          chat_sessions_count: 0,
          last_message_at: null,
          unread_messages_count: 0,
          last_note_updated_at: null,
          notes_count: 0,
          pending_video_reviews: 0,
        }
      }

      const commitmentHistory =
        commitmentHistoryResult.status === 'fulfilled'
          ? commitmentHistoryResult.value || []
          : []
      const workoutHistory =
        workoutHistoryResult.status === 'fulfilled'
          ? workoutHistoryResult.value || []
          : []
      const exercisePerformance =
        exercisePerformanceResult.status === 'fulfilled'
          ? exercisePerformanceResult.value || []
          : []
      const weeklyWorkouts =
        weeklyWorkoutsResult.status === 'fulfilled'
          ? weeklyWorkoutsResult.value || []
          : []

      // Log errors but don't fail completely
      if (metricsResult.status === 'rejected') {
        console.warn('Could not fetch client metrics (member may not be a direct client):', metricsResult.reason)
      }
      if (commitmentHistoryResult.status === 'rejected') {
        console.warn('Error fetching commitment history:', commitmentHistoryResult.reason)
      }
      if (workoutHistoryResult.status === 'rejected') {
        console.warn('Error fetching workout history:', workoutHistoryResult.reason)
      }
      if (exercisePerformanceResult.status === 'rejected') {
        console.warn('Error fetching exercise performance:', exercisePerformanceResult.reason)
      }
      if (weeklyWorkoutsResult.status === 'rejected') {
        console.warn('Error fetching weekly workouts:', weeklyWorkoutsResult.reason)
      }

      setMemberDetails({
        metrics,
        commitmentHistory,
        workoutHistory,
        exercisePerformance,
        weeklyWorkouts,
        loading: false,
      })
    } catch (error) {
      console.error('Error loading member details:', error)
      setMemberDetails({
        metrics: null,
        commitmentHistory: [],
        workoutHistory: [],
        exercisePerformance: [],
        weeklyWorkouts: [],
        loading: false,
      })
    }
  }

  // Load workout details
  const loadWorkoutDetails = async (sessionId: string) => {
    const details = await CoachService.getWorkoutSessionDetails(sessionId)
    setWorkoutDetails(details)
  }

  // Handle workout click
  const handleWorkoutClick = async (workout: WorkoutHistory) => {
    setSelectedWorkout({ sessionId: workout.session_id, workout })
    await loadWorkoutDetails(workout.session_id)
  }

  // Handle weekly workout expansion
  const handleWeeklyWorkoutClick = async (workout: WorkoutInPlan) => {
    if (expandedWorkoutId === workout.workout_id) {
      // Collapse
      setExpandedWorkoutId(null)
      setWorkoutTemplateDetails(null)
      setWorkoutPersonalBests(new Map())
    } else {
      // Expand
      setExpandedWorkoutId(workout.workout_id)
      
      // Fetch workout template details
      const templateDetails = await CoachService.getWorkoutTemplateDetails(workout.workout_id)
      if (templateDetails) {
        setWorkoutTemplateDetails({
          workoutId: templateDetails.workout_id,
          exercises: templateDetails.exercises,
        })
      }

      // Fetch personal bests for the user
      if (selectedMember) {
        const personalBests = await CoachService.getUserPersonalBests(selectedMember.userId)
        const pbMap = new Map<string, PersonalBest>()
        personalBests.forEach((pb) => {
          pbMap.set(pb.exercise_name, pb)
        })
        setWorkoutPersonalBests(pbMap)
      }
    }
  }

  // Handle exercise click - navigate to progression tab
  const handleExerciseClick = (exerciseName: string) => {
    setSelectedExercise(exerciseName)
    setActiveMemberTab('progression')
    setSelectedWorkout(null) // Close workout detail if open
  }

  // Load chat when chat panel is opened
  useEffect(() => {
    if (!showChat || !moaiDetail || !coachProfile?.user_id) return

    let unsubscribe: (() => void) | null = null

    const loadChat = async () => {
      try {
        const chat = await ChatService.getMoaiChat(moaiId)
        if (!chat) {
          console.error('Moai chat not found')
          return
        }

        setMoaiChat(chat)
        const messages = await ChatService.getMoaiChatMessages(
          chat.id,
          moaiDetail.coach_subscription_started_at
        )
        setChatMessages(messages)

        // Subscribe to new messages
        unsubscribe = ChatService.subscribeToMoaiChatMessages(
          chat.id,
          moaiDetail.coach_subscription_started_at,
          (newMessage) => {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        )
      } catch (error) {
        console.error('Error loading chat:', error)
      }
    }

    loadChat()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [showChat, moaiId, moaiDetail, coachProfile?.user_id])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (showChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, showChat])

  const handleSendMessage = async () => {
    if (!chatInputText.trim() || !moaiChat || !coachProfile?.user_id || sendingMessage) return

    setSendingMessage(true)
    try {
      const newMessage = await ChatService.sendMoaiChatMessage(
        moaiChat.id,
        coachProfile.user_id,
        chatInputText.trim()
      )
      if (newMessage) {
        setChatMessages((prev) => [...prev, newMessage])
        setChatInputText('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle member card click
  const handleMemberClick = (member: MoaiMemberMetrics) => {
    setSelectedMember({ userId: member.user_id, member })
    loadMemberDetails(member.user_id)
  }

  // Calculate week-over-week trends
  const trendAnalysis = useMemo((): TrendAnalysis | null => {
    if (!moaiDetail || moaiDetail.moai_commitment_history.length < 2) return null

    const history = [...moaiDetail.moai_commitment_history]
      .sort((a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime())
      .slice(-8) // Last 8 weeks for trend analysis

    if (history.length < 2) return null

    const recent = history.slice(-4) // Last 4 weeks
    const previous = history.slice(-8, -4) // Previous 4 weeks

    const recentAvg = recent.reduce((sum, w) => sum + w.completion_rate, 0) / recent.length
    const previousAvg = previous.reduce((sum, w) => sum + w.completion_rate, 0) / previous.length

    const completionRateChange = recentAvg - previousAvg
    const completionRateTrend: 'up' | 'down' | 'stable' =
      completionRateChange > 5 ? 'up' : completionRateChange < -5 ? 'down' : 'stable'

    const recentMemberAvg = recent.reduce((sum, w) => sum + w.member_count, 0) / recent.length
    const previousMemberAvg = previous.reduce((sum, w) => sum + w.member_count, 0) / previous.length

    const memberEngagementChange = recentMemberAvg - previousMemberAvg
    const memberEngagementTrend: 'up' | 'down' | 'stable' =
      memberEngagementChange > 0.5 ? 'up' : memberEngagementChange < -0.5 ? 'down' : 'stable'

    return {
      completionRateTrend,
      completionRateChange: Math.abs(completionRateChange),
      memberEngagementTrend,
      memberEngagementChange: Math.abs(memberEngagementChange),
      recentWeeks: recent.map((w) => ({
        week_start: w.week_start,
        completion_rate: w.completion_rate,
        member_count: w.member_count,
      })),
    }
  }, [moaiDetail])


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Moai details...</p>
        </div>
      </div>
    )
  }

  if (!moaiDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Moai not found or you don't have access</p>
        <Link href="/coach/moais" className="mt-4 text-blue-600 hover:text-blue-800">
          Back to Moais
        </Link>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/coach/moais" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{moaiDetail.name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {moaiDetail.member_count} members • {moaiDetail.status} • {moaiDetail.weeks_active} weeks active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/coach/login')
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${
        showChat ? 'md:mr-96' : ''
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Commitment %</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {(() => {
                        // Calculate total commitments met / total commitments set
                        const totalCommitment = moaiDetail.moai_commitment_history?.reduce(
                          (sum, week) => sum + (week.total_commitment || 0),
                          0
                        ) || 0
                        const totalCompleted = moaiDetail.moai_commitment_history?.reduce(
                          (sum, week) => sum + (week.total_completed || 0),
                          0
                        ) || 0
                        const commitmentPercent = totalCommitment > 0 
                          ? (totalCompleted / totalCommitment) * 100 
                          : 0
                        return commitmentPercent.toFixed(1)
                      })()}%
                    </p>
                    {trendAnalysis && (
                      <div className="flex items-center gap-1 mt-2">
                        {trendAnalysis.completionRateTrend === 'up' ? (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              +{trendAnalysis.completionRateChange.toFixed(1)}% vs previous period
                            </span>
                          </>
                        ) : trendAnalysis.completionRateTrend === 'down' ? (
                          <>
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-600">
                              -{trendAnalysis.completionRateChange.toFixed(1)}% vs previous period
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Stable</span>
                        )}
                      </div>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.moai_workout_stats?.total_workouts || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {moaiDetail.moai_workout_stats?.completed_workouts || 0} completed
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Members</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.member_count}
                    </p>
                    {trendAnalysis && (
                      <div className="flex items-center gap-1 mt-2">
                        {trendAnalysis.memberEngagementTrend === 'up' ? (
                          <span className="text-sm text-green-600">
                            +{trendAnalysis.memberEngagementChange.toFixed(1)} avg members
                          </span>
                        ) : trendAnalysis.memberEngagementTrend === 'down' ? (
                          <span className="text-sm text-red-600">
                            -{trendAnalysis.memberEngagementChange.toFixed(1)} avg members
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Stable</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Member Performance Overview */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Member Performance</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moaiDetail.members?.map((member) => {
                    const memberName =
                      member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.first_name || member.username || 'Member'

                    const isStruggling = member.current_week_completion_rate < 50
                    const isHighPerformer = member.overall_completion_rate >= 85
                    const isInconsistent =
                      member.current_week_completion_rate > 80 &&
                      member.overall_completion_rate < 70

                    return (
                      <button
                        key={member.user_id}
                        onClick={() => handleMemberClick(member)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {member.profile_picture_url ? (
                                <img
                                  src={member.profile_picture_url}
                                  alt={memberName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-600 font-medium">
                                  {(member.first_name?.[0] || member.username?.[0] || 'M').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {memberName}
                                </p>
                                {isStruggling && (
                                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                )}
                                {isHighPerformer && (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                {isInconsistent && (
                                  <Activity className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                )}
                              </div>
                              {member.username && (
                                <p className="text-xs text-gray-500">@{member.username}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">This Week</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.current_week_completed}/{member.current_week_commitment}
                            </p>
                            <p
                              className={`text-xs ${
                                member.current_week_completion_rate >= 80
                                  ? 'text-green-600'
                                  : member.current_week_completion_rate >= 60
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {member.current_week_completion_rate.toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Overall</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.overall_completion_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.total_workouts} workouts
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Week-over-Week Performance Trend */}
            {trendAnalysis && trendAnalysis.recentWeeks.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Performance Trend</h2>
                  <p className="text-sm text-gray-500 mt-1">Last 4 weeks</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {trendAnalysis.recentWeeks.map((week, idx) => {
                      const prevWeek = trendAnalysis.recentWeeks[idx - 1]
                      const change = prevWeek
                        ? week.completion_rate - prevWeek.completion_rate
                        : 0
                      return (
                        <div key={week.week_start} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-gray-600">
                            {formatDate(week.week_start)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {week.completion_rate.toFixed(1)}% completion
                              </span>
                              {prevWeek && (
                                <span
                                  className={`text-xs flex items-center gap-1 ${
                                    change > 0
                                      ? 'text-green-600'
                                      : change < 0
                                      ? 'text-red-600'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {change > 0 ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                  ) : change < 0 ? (
                                    <ArrowDownRight className="h-3 w-3" />
                                  ) : null}
                                  {change !== 0 ? Math.abs(change).toFixed(1) + '%' : 'No change'}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  week.completion_rate >= 80
                                    ? 'bg-green-600'
                                    : week.completion_rate >= 60
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(week.completion_rate, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 w-16 text-right">
                            {week.member_count} members
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Member Engagement Dashboard */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Member Engagement Dashboard</h2>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Engagement Scores */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Engagement Scores</h3>
                  <div className="space-y-2">
                    {moaiDetail.members?.map((member) => {
                      const memberName =
                        member.first_name && member.last_name
                          ? `${member.first_name} ${member.last_name}`
                          : member.first_name || member.username || 'Member'
                      
                      // Calculate engagement score (0-100)
                      // Factors: current week completion, overall completion, consistency, commitment set
                      const hasCommitment = member.current_week_commitment > 0
                      const currentWeekScore = member.current_week_completion_rate
                      const overallScore = member.overall_completion_rate
                      const consistencyScore = member.total_commitment_weeks > 0 
                        ? Math.min(100, (member.total_workouts / (member.total_commitment_weeks * 3)) * 100)
                        : 0
                      
                      const engagementScore = Math.round(
                        (currentWeekScore * 0.4) + 
                        (overallScore * 0.4) + 
                        (consistencyScore * 0.2)
                      )
                      
                      const engagementLevel = engagementScore >= 80 ? 'high' : engagementScore >= 60 ? 'medium' : 'low'
                      
                      return (
                        <div key={member.user_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {member.profile_picture_url ? (
                                <img
                                  src={member.profile_picture_url}
                                  alt={memberName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-600 font-medium text-sm">
                                  {(member.first_name?.[0] || member.username?.[0] || 'M').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{memberName}</p>
                              {member.username && (
                                <p className="text-xs text-gray-500">@{member.username}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Score</span>
                                <span className={`text-sm font-semibold ${
                                  engagementLevel === 'high' ? 'text-green-600' :
                                  engagementLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {engagementScore}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    engagementLevel === 'high' ? 'bg-green-600' :
                                    engagementLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${engagementScore}%` }}
                                />
                              </div>
                            </div>
                            {!hasCommitment && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                No Commitment
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* At-Risk Members */}
                {(() => {
                  const atRiskMembers = moaiDetail.members?.filter((member) => {
                    const noCommitment = member.current_week_commitment === 0
                    const lowCompletion = member.current_week_completion_rate < 50 && member.current_week_commitment > 0
                    const declining = member.overall_completion_rate < 60 && member.total_commitment_weeks >= 3
                    return noCommitment || lowCompletion || declining
                  }) || []

                  if (atRiskMembers.length === 0) return null

                  return (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        At-Risk Members ({atRiskMembers.length})
                      </h3>
                      <div className="space-y-2">
                        {atRiskMembers.map((member) => {
                          const memberName =
                            member.first_name && member.last_name
                              ? `${member.first_name} ${member.last_name}`
                              : member.first_name || member.username || 'Member'
                          
                          const reasons = []
                          if (member.current_week_commitment === 0) reasons.push('No commitment set')
                          if (member.current_week_completion_rate < 50 && member.current_week_commitment > 0) {
                            reasons.push('Low completion this week')
                          }
                          if (member.overall_completion_rate < 60 && member.total_commitment_weeks >= 3) {
                            reasons.push('Declining performance')
                          }

                          return (
                            <div
                              key={member.user_id}
                              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {member.profile_picture_url ? (
                                    <img
                                      src={member.profile_picture_url}
                                      alt={memberName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-gray-600 font-medium text-xs">
                                      {(member.first_name?.[0] || member.username?.[0] || 'M').toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{memberName}</p>
                                  <p className="text-xs text-gray-600">{reasons.join(', ')}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleMemberClick(member)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View Details
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Member Details Modal */}
            {selectedMember && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {selectedMember.member.profile_picture_url ? (
                          <img
                            src={selectedMember.member.profile_picture_url}
                            alt={
                              selectedMember.member.first_name && selectedMember.member.last_name
                                ? `${selectedMember.member.first_name} ${selectedMember.member.last_name}`
                                : selectedMember.member.first_name ||
                                  selectedMember.member.username ||
                                  'Member'
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium">
                            {(
                              selectedMember.member.first_name?.[0] ||
                              selectedMember.member.username?.[0] ||
                              'M'
                            ).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedMember.member.first_name && selectedMember.member.last_name
                            ? `${selectedMember.member.first_name} ${selectedMember.member.last_name}`
                            : selectedMember.member.first_name ||
                              selectedMember.member.username ||
                              'Member'}
                        </h2>
                        {selectedMember.member.username && (
                          <p className="text-sm text-gray-500">@{selectedMember.member.username}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/coach/clients/${selectedMember.userId}`}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Full Profile
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedMember(null)
                          setMemberDetails({
                            metrics: null,
                            commitmentHistory: [],
                            workoutHistory: [],
                            exercisePerformance: [],
                            weeklyWorkouts: [],
                            loading: false,
                          })
                          setActiveMemberTab('workouts')
                          setSelectedWorkout(null)
                          setSelectedExercise(null)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto flex flex-col">
                    {memberDetails.loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-4 text-gray-600">Loading member details...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Tabs */}
                        <div className="border-b border-gray-200 px-6">
                          <nav className="flex space-x-8">
                            <button
                              onClick={() => {
                                setActiveMemberTab('workouts')
                                setSelectedWorkout(null)
                              }}
                              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeMemberTab === 'workouts'
                                  ? 'border-blue-500 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Workouts
                            </button>
                            <button
                              onClick={() => {
                                setActiveMemberTab('progression')
                                setSelectedWorkout(null)
                              }}
                              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeMemberTab === 'progression'
                                  ? 'border-blue-500 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Progression
                            </button>
                            <button
                              onClick={() => {
                                setActiveMemberTab('program')
                                setSelectedWorkout(null)
                              }}
                              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                activeMemberTab === 'program'
                                  ? 'border-blue-500 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Program
                            </button>
                          </nav>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                          {activeMemberTab === 'workouts' && (
                            <div className="space-y-6">
                        {/* Key Metrics */}
                        {memberDetails.metrics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Target className="h-4 w-4 text-blue-600" />
                                <p className="text-xs text-gray-600">This Week</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">
                                {memberDetails.metrics.current_week_completed}/
                                {memberDetails.metrics.current_week_commitment}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {memberDetails.metrics.current_week_completion_rate.toFixed(1)}%
                                completion
                              </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="h-4 w-4 text-green-600" />
                                <p className="text-xs text-gray-600">Overall Rate</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">
                                {memberDetails.metrics.overall_completion_rate.toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {memberDetails.metrics.total_commitment_weeks} weeks tracked
                              </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Dumbbell className="h-4 w-4 text-purple-600" />
                                <p className="text-xs text-gray-600">Total Workouts</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">
                                {memberDetails.metrics.total_completed_workouts}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {memberDetails.metrics.total_workout_sessions} sessions
                              </p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-orange-600" />
                                <p className="text-xs text-gray-600">Last Workout</p>
                              </div>
                              <p className="text-lg font-bold text-gray-900">
                                {memberDetails.metrics.last_workout_date
                                  ? formatDate(memberDetails.metrics.last_workout_date.split('T')[0])
                                  : 'Never'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {memberDetails.metrics.chat_sessions_count} chat sessions
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Commitment History */}
                        {memberDetails.commitmentHistory.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Commitment History
                            </h3>
                            <div className="space-y-3">
                              {memberDetails.commitmentHistory.slice(0, 12).map((week, idx) => {
                                const prevWeek =
                                  idx < memberDetails.commitmentHistory.length - 1
                                    ? memberDetails.commitmentHistory[idx + 1]
                                    : null
                                const change = prevWeek
                                  ? week.completion_rate - prevWeek.completion_rate
                                  : 0
                                return (
                                  <div key={week.id} className="flex items-center gap-4">
                                    <div className="w-24 text-sm text-gray-600">
                                      {formatDate(week.week_start)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-900">
                                          {week.completed_sessions}/{week.commitment_count} sessions
                                        </span>
                                        {prevWeek && (
                                          <span
                                            className={`text-xs flex items-center gap-1 ${
                                              change > 0
                                                ? 'text-green-600'
                                                : change < 0
                                                ? 'text-red-600'
                                                : 'text-gray-500'
                                            }`}
                                          >
                                            {change > 0 ? (
                                              <ArrowUpRight className="h-3 w-3" />
                                            ) : change < 0 ? (
                                              <ArrowDownRight className="h-3 w-3" />
                                            ) : null}
                                            {change !== 0
                                              ? Math.abs(change).toFixed(1) + '%'
                                              : 'No change'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${
                                            week.completion_rate >= 80
                                              ? 'bg-green-600'
                                              : week.completion_rate >= 60
                                              ? 'bg-yellow-500'
                                              : 'bg-red-500'
                                          }`}
                                          style={{
                                            width: `${Math.min(week.completion_rate, 100)}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 w-20 text-right">
                                      {week.completion_rate.toFixed(1)}%
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                              {/* Key Metrics */}
                              {memberDetails.metrics && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="h-4 w-4 text-blue-600" />
                                      <p className="text-xs text-gray-600">This Week</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                      {memberDetails.metrics.current_week_completed}/
                                      {memberDetails.metrics.current_week_commitment}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {memberDetails.metrics.current_week_completion_rate.toFixed(1)}%
                                      completion
                                    </p>
                                  </div>
                                  <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <BarChart3 className="h-4 w-4 text-green-600" />
                                      <p className="text-xs text-gray-600">Overall Rate</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                      {memberDetails.metrics.overall_completion_rate.toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {memberDetails.metrics.total_commitment_weeks} weeks tracked
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Dumbbell className="h-4 w-4 text-purple-600" />
                                      <p className="text-xs text-gray-600">Total Workouts</p>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">
                                      {memberDetails.metrics.total_completed_workouts}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {memberDetails.metrics.total_workout_sessions} sessions
                                    </p>
                                  </div>
                                  <div className="bg-orange-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="h-4 w-4 text-orange-600" />
                                      <p className="text-xs text-gray-600">Last Workout</p>
                                    </div>
                                    <p className="text-lg font-bold text-gray-900">
                                      {memberDetails.metrics.last_workout_date
                                        ? formatDate(memberDetails.metrics.last_workout_date.split('T')[0])
                                        : 'Never'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {memberDetails.metrics.chat_sessions_count} chat sessions
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Workout Detail View */}
                              {selectedWorkout && workoutDetails && workoutDetails.session ? (
                                <div className="space-y-4">
                                  <button
                                    onClick={() => setSelectedWorkout(null)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Workouts
                                  </button>
                                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <div className="mb-4">
                                      <h3 className="text-xl font-semibold text-gray-900">
                                        {workoutDetails.session.workout_title || 'Workout'}
                                      </h3>
                                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                        <span>{formatDate(workoutDetails.session.date)}</span>
                                        <span>•</span>
                                        <span>{workoutDetails.session.workout_type || 'N/A'}</span>
                                        <span>•</span>
                                        <span>
                                          {workoutDetails.session.total_duration_seconds
                                            ? `${Math.floor(workoutDetails.session.total_duration_seconds / 60)} min`
                                            : 'N/A'}
                                        </span>
                                        {workoutDetails.session.rpe && (
                                          <>
                                            <span>•</span>
                                            <span>RPE: {workoutDetails.session.rpe}</span>
                                          </>
                                        )}
                                      </div>
                                      {workoutDetails.session.notes && (
                                        <p className="mt-3 text-sm text-gray-700 italic bg-gray-50 p-3 rounded">
                                          "{workoutDetails.session.notes}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="space-y-6">
                                      {workoutDetails.exercises.map((exercise) => (
                                        <div key={exercise.exercise_name} className="border-t border-gray-200 pt-4">
                                          <button
                                            onClick={() => handleExerciseClick(exercise.exercise_name)}
                                            className="text-left w-full"
                                          >
                                            <h4 className="text-lg font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
                                              {exercise.exercise_name}
                                            </h4>
                                          </button>
                                          <div className="space-y-2">
                                            {exercise.sets.map((set) => (
                                              <div
                                                key={set.id}
                                                className={`flex items-center gap-4 p-2 rounded ${
                                                  set.is_completed ? 'bg-green-50' : 'bg-gray-50'
                                                }`}
                                              >
                                                <span className="text-sm font-medium text-gray-600 w-12">
                                                  Set {set.set_number}
                                                </span>
                                                <div className="flex-1 flex items-center gap-4">
                                                  {set.weight_lbs && (
                                                    <span className="text-sm text-gray-900">
                                                      {set.weight_lbs} lbs
                                                    </span>
                                                  )}
                                                  {set.reps && (
                                                    <span className="text-sm text-gray-900">
                                                      {set.reps} reps
                                                    </span>
                                                  )}
                                                </div>
                                                {set.is_completed ? (
                                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                                ) : (
                                                  <AlertCircle className="h-4 w-4 text-gray-400" />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Workout List */
                                <div className="space-y-3">
                                  {memberDetails.workoutHistory.length > 0 ? (
                                    memberDetails.workoutHistory.map((workout) => (
                                      <button
                                        key={workout.session_id}
                                        onClick={() => handleWorkoutClick(workout)}
                                        className="w-full text-left flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900">
                                            {workout.workout_title || 'Workout'}
                                          </p>
                                          <p className="text-sm text-gray-500 mt-1">
                                            {formatDate(workout.date)} • {workout.workout_type || 'N/A'} •{' '}
                                            {workout.exercise_count} exercises
                                          </p>
                                        </div>
                                        <div className="text-right ml-4">
                                          <p className="text-sm font-medium text-gray-900">
                                            {workout.completed_sets}/{workout.total_sets} sets
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {workout.status === 'completed' ? '✓ Completed' : workout.status}
                                          </p>
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="text-center py-12">
                                      <p className="text-gray-500">No workouts found</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {activeMemberTab === 'progression' && (
                            <div className="space-y-6">
                              {/* Exercise Selection */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Select Exercise
                                </label>
                                <select
                                  value={selectedExercise || ''}
                                  onChange={(e) => setSelectedExercise(e.target.value || null)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">All Exercises</option>
                                  {Array.from(
                                    new Set(memberDetails.exercisePerformance.map((ep) => ep.exercise_name))
                                  )
                                    .sort()
                                    .map((exerciseName) => (
                                      <option key={exerciseName} value={exerciseName}>
                                        {exerciseName}
                                      </option>
                                    ))}
                                </select>
                              </div>

                              {/* Exercise Progression Chart */}
                              {selectedExercise ? (
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                    {selectedExercise} Progression
                                  </h3>
                                  <div className="space-y-4">
                                    {memberDetails.exercisePerformance
                                      .filter((ep) => ep.exercise_name === selectedExercise)
                                      .sort(
                                        (a, b) =>
                                          new Date(a.workout_date).getTime() -
                                          new Date(b.workout_date).getTime()
                                      )
                                      .map((perf, idx, arr) => {
                                        const prevPerf = idx > 0 ? arr[idx - 1] : null
                                        const weightChange = prevPerf
                                          ? perf.avg_weight_lbs - prevPerf.avg_weight_lbs
                                          : 0
                                        const repsChange = prevPerf
                                          ? perf.avg_reps - prevPerf.avg_reps
                                          : 0
                                        return (
                                          <div
                                            key={`${perf.workout_session_id}-${perf.workout_date}`}
                                            className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-sm font-medium text-gray-900">
                                                {formatDate(perf.workout_date)}
                                              </span>
                                              {prevPerf && (
                                                <div className="flex items-center gap-2 text-xs">
                                                  {weightChange > 0 && (
                                                    <span className="text-green-600">
                                                      +{weightChange.toFixed(1)} lbs
                                                    </span>
                                                  )}
                                                  {repsChange > 0 && (
                                                    <span className="text-green-600">
                                                      +{repsChange.toFixed(0)} reps
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                              <div>
                                                <p className="text-gray-500">Avg Weight</p>
                                                <p className="font-semibold text-gray-900">
                                                  {perf.avg_weight_lbs.toFixed(1)} lbs
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-500">Max Weight</p>
                                                <p className="font-semibold text-gray-900">
                                                  {perf.max_weight_lbs.toFixed(1)} lbs
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-500">Avg Reps</p>
                                                <p className="font-semibold text-gray-900">
                                                  {perf.avg_reps.toFixed(1)}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-500">Total Volume</p>
                                                <p className="font-semibold text-gray-900">
                                                  {perf.total_volume.toFixed(0)} lbs
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-12">
                                  <p className="text-gray-500">Select an exercise to view progression</p>
                                </div>
                              )}
                            </div>
                          )}

                          {activeMemberTab === 'program' && (
                            <div className="space-y-6">
                              {/* Current Week Program */}
                              {(memberDetails.weeklyWorkouts.length > 0 || (memberDetails.metrics && memberDetails.metrics.current_week_commitment > 0)) ? (
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      This Week's Program
                                    </h3>
                                    <div className="text-sm text-gray-600">
                                      {memberDetails.metrics?.current_week_start
                                        ? formatDate(memberDetails.metrics.current_week_start.split('T')[0])
                                        : 'Current Week'}
                                    </div>
                                  </div>
                                  {memberDetails.metrics && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">Commitment Level:</span> {memberDetails.metrics.current_week_commitment} workout{memberDetails.metrics.current_week_commitment !== 1 ? 's' : ''} this week
                                      </p>
                                      {memberDetails.metrics.current_week_commitment > 0 && (
                                        <p className="text-sm text-gray-700 mt-1">
                                          <span className="font-medium">Completed:</span> {memberDetails.metrics.current_week_completed} / {memberDetails.metrics.current_week_commitment}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {memberDetails.weeklyWorkouts.length > 0 ? (
                                    <div className="space-y-3">
                                      {memberDetails.weeklyWorkouts.map((workout) => {
                                        const isExpanded = expandedWorkoutId === workout.workout_id
                                        const templateDetails = workoutTemplateDetails?.workoutId === workout.workout_id 
                                          ? workoutTemplateDetails 
                                          : null
                                        
                                        return (
                                          <div key={workout.workout_id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <button
                                              onClick={() => handleWeeklyWorkoutClick(workout)}
                                              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                                            >
                                              <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                  {workout.workout_title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {workout.workout_type} • Assigned {formatDate(workout.assigned_at.split('T')[0])}
                                                </p>
                                              </div>
                                              <div className="text-right ml-4 flex items-center gap-2">
                                                {workout.status === 'completed' ? (
                                                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Completed
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                    Assigned
                                                  </span>
                                                )}
                                                <ArrowDownRight 
                                                  className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                              </div>
                                            </button>
                                            
                                            {isExpanded && templateDetails && (
                                              <div className="border-t border-gray-200 bg-white p-4">
                                                <div className="space-y-3">
                                                  {templateDetails.exercises.map((exercise) => {
                                                    const pb = workoutPersonalBests.get(exercise.exercise_name)
                                                    const setsList = exercise.sets.map((set, idx) => {
                                                      const parts = []
                                                      if (set.target_weight_lbs) parts.push(`${set.target_weight_lbs} lbs`)
                                                      if (set.target_reps) parts.push(`${set.target_reps} reps`)
                                                      const setNum = set.set_number ?? idx + 1
                                                      return `Set ${setNum}: ${parts.join(' ')}`
                                                    }).join(', ')
                                                    
                                                    return (
                                                      <div key={exercise.exercise_name} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                                        <div className="flex-1">
                                                          <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                              {exercise.exercise_name}
                                                            </span>
                                                            {pb && (
                                                              <span className="text-xs text-blue-600">
                                                                (PB: {pb.max_weight_lbs ? `${pb.max_weight_lbs} lbs` : ''} {pb.max_reps ? `${pb.max_reps} reps` : ''})
                                                              </span>
                                                            )}
                                                          </div>
                                                          <p className="text-xs text-gray-600">
                                                            {setsList || 'No sets specified'}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    )
                                                  })}
                                                  {templateDetails.exercises.length === 0 && (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                      No exercise details available for this workout
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {isExpanded && !templateDetails && (
                                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                                <p className="text-sm text-gray-500 text-center py-4">
                                                  Loading workout details...
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <p className="text-gray-500">No workouts assigned for this week</p>
                                      <p className="text-sm text-gray-400 mt-2">
                                        Workouts will appear here when assigned based on the user's commitment
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                  <div className="text-center py-8">
                                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 font-medium">No Commitment Set</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                      This user hasn't set a commitment for this week, so no workouts have been assigned.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Weeks Active</p>
                  <p className="text-lg font-bold text-gray-900">{moaiDetail.weeks_active}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Weekly Commitment</p>
                  <p className="text-lg font-bold text-gray-900">
                    {moaiDetail.moai_commitment_history.length > 0
                      ? (
                          moaiDetail.moai_commitment_history.reduce(
                            (sum, w) => sum + w.total_commitment,
                            0
                          ) / moaiDetail.moai_commitment_history.length
                        ).toFixed(1)
                      : '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Best Week</p>
                  <p className="text-lg font-bold text-gray-900">
                    {moaiDetail.moai_commitment_history.length > 0
                      ? Math.max(
                          ...moaiDetail.moai_commitment_history.map((w) => w.completion_rate)
                        ).toFixed(1) + '%'
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Commitment History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Recent Weeks</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {moaiDetail.moai_commitment_history?.slice(0, 6).map((week) => (
                    <div key={week.week_start} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">{formatDate(week.week_start)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                week.completion_rate >= 80
                                  ? 'bg-green-600'
                                  : week.completion_rate >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(week.completion_rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-900 w-12 text-right">
                            {week.completion_rate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Slide-in Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          showChat ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Moai Chat</h2>
              <p className="text-xs text-gray-500 mt-1">{moaiDetail?.name}</p>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="mb-2">No messages yet.</p>
                <p className="text-sm">
                  Messages from before you were added to this Moai are not shown.
                </p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.is_coach ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-start gap-2 max-w-[80%]">
                    {!message.is_coach && message.sender_profile_picture_url && (
                      <img
                        src={message.sender_profile_picture_url}
                        alt={message.sender_name || 'User'}
                        className="h-8 w-8 rounded-full flex-shrink-0"
                      />
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.is_coach
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {!message.is_coach && (
                        <p
                          className={`text-xs font-medium mb-1 ${
                            message.is_coach ? 'text-blue-100' : 'text-gray-600'
                          }`}
                        >
                          {message.sender_name || 'User'}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.is_coach ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInputText.trim() || sendingMessage}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when chat is open */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setShowChat(false)}
        />
      )}
    </div>
  )
}

