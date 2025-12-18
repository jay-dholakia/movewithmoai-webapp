'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import { ChatService } from '@/lib/services/chatService'
import type { MoaiDetail, CoachProfile } from '@/lib/types/coach'
import type { MoaiChatMessage, MoaiChat } from '@/lib/services/chatService'
import Link from 'next/link'
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  TrendingUp,
  Activity,
  Users,
  Target,
} from 'lucide-react'

type TabType = 'overview' | 'members' | 'commitments' | 'workouts' | 'chat'

export default function MoaiDetailPage() {
  const params = useParams()
  const router = useRouter()
  const moaiId = params.moaiId as string

  const [moaiDetail, setMoaiDetail] = useState<MoaiDetail | null>(null)
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

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
      // Set error state to show error message
      setMoaiDetail(null)
    } finally {
      setLoading(false)
    }
  }

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
        <Link
          href="/coach/moais"
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Moais
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/coach/moais"
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{moaiDetail.name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {moaiDetail.member_count} members • {moaiDetail.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'commitments', label: 'Commitments', icon: Calendar },
              { id: 'workouts', label: 'Workouts', icon: TrendingUp },
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Members</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.member_count}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Weeks Active</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.weeks_active}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overall Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.moai_workout_stats?.average_completion_rate.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.moai_workout_stats?.total_workouts || 0}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Recent Commitment History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Commitment History
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Committed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {moaiDetail.moai_commitment_history?.slice(0, 8).map((week) => (
                      <tr key={week.week_start}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            // Parse date string (YYYY-MM-DD) and format as MM/DD/YYYY
                            // Split the date string to avoid timezone conversion issues
                            const [year, month, day] = week.week_start.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            return date.toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric'
                            });
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.member_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.total_commitment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.total_completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {week.completion_rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Members</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workouts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {moaiDetail.members?.map((member) => (
                    <tr key={member.user_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {member.profile_picture_url ? (
                              <img
                                src={member.profile_picture_url}
                                alt={member.first_name || 'Member'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 font-medium">
                                {(member.first_name?.[0] ||
                                  member.username?.[0] ||
                                  'M').toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.first_name && member.last_name
                                ? `${member.first_name} ${member.last_name}`
                                : member.first_name || member.username || 'Member'}
                            </div>
                            {member.username && (
                              <div className="text-sm text-gray-500">@{member.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.current_week_completed}/{member.current_week_commitment}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.current_week_completion_rate.toFixed(0)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {member.overall_completion_rate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.total_workouts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Committed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {moaiDetail.moai_commitment_history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No commitment history available for this Moai.
                      </td>
                    </tr>
                  ) : (
                    moaiDetail.moai_commitment_history?.map((week) => (
                      <tr key={week.week_start}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            // Parse date string (YYYY-MM-DD) and format as MM/DD/YYYY
                            // Split the date string to avoid timezone conversion issues
                            const [year, month, day] = week.week_start.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            return date.toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric'
                            });
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.member_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.total_commitment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {week.total_completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {week.completion_rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'workouts' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Workout Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moaiDetail.moai_workout_stats.total_workouts}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Completed Workouts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moaiDetail.moai_workout_stats.completed_workouts}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Average Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moaiDetail.moai_workout_stats.average_completion_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && moaiDetail && coachProfile && coachProfile.user_id && (
          <MoaiChatInterface
            moaiId={moaiId}
            coachUserId={coachProfile.user_id}
            coachSubscriptionStart={moaiDetail.coach_subscription_started_at}
          />
        )}
      </div>
    </div>
  )
}

// Moai Chat Interface Component
function MoaiChatInterface({
  moaiId,
  coachUserId,
  coachSubscriptionStart,
}: {
  moaiId: string
  coachUserId: string
  coachSubscriptionStart: string
}) {
  const [messages, setMessages] = useState<MoaiChatMessage[]>([])
  const [chat, setChat] = useState<MoaiChat | null>(null)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadChat = async () => {
      try {
        setLoading(true)
        const moaiChat = await ChatService.getMoaiChat(moaiId)
        if (!moaiChat) {
          console.error('Moai chat not found')
          setLoading(false)
          return
        }

        setChat(moaiChat)
        const chatMessages = await ChatService.getMoaiChatMessages(
          moaiChat.id,
          coachSubscriptionStart
        )
        setMessages(chatMessages)

        // Subscribe to new messages in real-time
        unsubscribe = ChatService.subscribeToMoaiChatMessages(
          moaiChat.id,
          coachSubscriptionStart,
          (newMessage) => {
            console.log('New message received:', newMessage)
            setMessages((prev) => {
              // Check if message already exists (avoid duplicates)
              if (prev.some(m => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        )
      } catch (error) {
        console.error('Error loading chat:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChat()

    // Cleanup: unsubscribe when component unmounts or dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [moaiId, coachSubscriptionStart])

  const handleSend = async () => {
    if (!inputText.trim() || !chat || sending) return

    setSending(true)
    try {
      const newMessage = await ChatService.sendMoaiChatMessage(
        chat.id,
        coachUserId,
        inputText.trim()
      )
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

  if (!chat) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">Chat not available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">No messages yet.</p>
            <p className="text-sm">
              Messages from before you were added to this Moai are not shown.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_coach ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-xs lg:max-w-md">
                {!message.is_coach && message.sender_profile_picture_url && (
                  <img
                    src={message.sender_profile_picture_url}
                    alt={message.sender_name || 'User'}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.is_coach
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
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
                  <p className="text-sm">{message.message}</p>
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

