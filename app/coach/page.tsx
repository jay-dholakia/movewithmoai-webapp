'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import { ChatService } from '@/lib/services/chatService'
import type { ClientMetrics, CoachProfile } from '@/lib/types/coach'
import type { ChatMessage, ChatSession } from '@/lib/services/chatService'
import Link from 'next/link'
import { Users, MessageSquare, TrendingUp, Calendar, AlertCircle, Search, ArrowUp, ArrowDown, X, User, LogOut, ArrowLeft } from 'lucide-react'

type SortField = 'name' | 'current_week' | 'overall_rate' | 'workouts' | 'last_activity' | 'status'
type SortDirection = 'asc' | 'desc'

export default function CoachDashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientMetrics[]>([])
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null)
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [filterPendingVideos, setFilterPendingVideos] = useState(false)
  const [sortField, setSortField] = useState<SortField>('last_activity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showChat, setShowChat] = useState(false)
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({})
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({})
  const [chatInputText, setChatInputText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Session error:', sessionError)
        setLoading(false)
        return
      }

      if (!session) {
        window.location.href = '/coach/login'
        return
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(session.user.id)
      if (!profile) {
        console.log('No coach profile found for user:', session.user.id)
        window.location.href = '/'
        return
      }

      setCoachProfile(profile)
      setCurrentCoachId(profile.id)

      // Get clients
      const clientsData = await CoachService.getClients(profile.id)
      console.log('Loaded clients:', clientsData.length)
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      // Show error to user
      alert('Error loading dashboard. Please check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  // Load chat for a specific client
  const loadChat = async (userId: string) => {
    if (chatMessages[userId] || !currentCoachId) return

    try {
      // Get or create chat session
      const session = await ChatService.getChatSession(userId, currentCoachId)
      if (!session) return

      setChatSessions(prev => ({ ...prev, [userId]: session }))

      // Get messages
      const messages = await ChatService.getMessages(session.id)
      setChatMessages(prev => ({ ...prev, [userId]: messages }))

      // Subscribe to new messages
      ChatService.subscribeToMessages(session.id, (newMessage) => {
        setChatMessages(prev => {
          const existing = prev[userId] || []
          if (existing.some(m => m.id === newMessage.id)) {
            return prev
          }
          return { ...prev, [userId]: [...existing, newMessage] }
        })
      })
    } catch (error) {
      console.error('Error loading chat:', error)
    }
  }

  // Handle selecting a chat
  const handleSelectChat = (userId: string) => {
    setSelectedChatUserId(userId)
    loadChat(userId)
  }

  // Send message
  const handleSendMessage = async () => {
    if (!chatInputText.trim() || !selectedChatUserId || !currentCoachId || sendingMessage) return

    const session = chatSessions[selectedChatUserId]
    if (!session) return

    setSendingMessage(true)
    try {
      const newMessage = await ChatService.sendMessage(
        session.id,
        currentCoachId,
        chatInputText.trim()
      )
      if (newMessage) {
        setChatMessages(prev => ({
          ...prev,
          [selectedChatUserId]: [...(prev[selectedChatUserId] || []), newMessage]
        }))
        setChatInputText('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedChatUserId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, selectedChatUserId])

  // Filter and sort clients - MUST be called before any early returns
  const filteredAndSortedClients = useMemo(() => {
    let filtered = [...clients]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (client) =>
          client.first_name?.toLowerCase().includes(query) ||
          client.last_name?.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          client.username?.toLowerCase().includes(query)
      )
    }

    // Apply status filters
    if (filterUnread) {
      filtered = filtered.filter((client) => client.unread_messages_count > 0)
    }
    if (filterPendingVideos) {
      filtered = filtered.filter((client) => client.pending_video_reviews > 0)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.first_name && a.last_name
            ? `${a.first_name} ${a.last_name[0]}.`
            : a.first_name || a.username || ''
          bValue = b.first_name && b.last_name
            ? `${b.first_name} ${b.last_name[0]}.`
            : b.first_name || b.username || ''
          break
        case 'current_week':
          aValue = a.current_week_completion_rate
          bValue = b.current_week_completion_rate
          break
        case 'overall_rate':
          aValue = a.overall_completion_rate
          bValue = b.overall_completion_rate
          break
        case 'workouts':
          aValue = a.total_completed_workouts
          bValue = b.total_completed_workouts
          break
        case 'last_activity':
          aValue = a.last_message_at
            ? new Date(a.last_message_at).getTime()
            : a.last_workout_date
            ? new Date(a.last_workout_date).getTime()
            : 0
          bValue = b.last_message_at
            ? new Date(b.last_message_at).getTime()
            : b.last_workout_date
            ? new Date(b.last_workout_date).getTime()
            : 0
          break
        case 'status':
          // Sort by priority: unread messages first, then pending videos
          aValue = (a.unread_messages_count > 0 ? 2 : 0) + (a.pending_video_reviews > 0 ? 1 : 0)
          bValue = (b.unread_messages_count > 0 ? 2 : 0) + (b.pending_video_reviews > 0 ? 1 : 0)
          break
        default:
          return 0
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      // Handle number comparison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [clients, searchQuery, filterUnread, filterPendingVideos, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 inline ml-1" />
    )
  }

  const totalUnreadMessages = clients.reduce((sum, client) => sum + client.unread_messages_count, 0)
  const totalPendingVideos = clients.reduce((sum, client) => sum + client.pending_video_reviews, 0)
  const avgCompletionRate = clients.length > 0
    ? clients.reduce((sum, client) => sum + client.overall_completion_rate, 0) / clients.length
    : 0

  // Show skeleton/loading state inline instead of full screen

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
              {loading ? (
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  {coachProfile?.name} • {clients.length} {clients.length === 1 ? 'client' : 'clients'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {totalUnreadMessages > 0 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">{totalUnreadMessages} unread</span>
                </div>
              )}
              {totalPendingVideos > 0 && (
                <div className="flex items-center gap-2 text-blue-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{totalPendingVideos} videos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{clients.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{avgCompletionRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnreadMessages}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Videos</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{totalPendingVideos}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredAndSortedClients.length} of {clients.length}
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterUnread(!filterUnread)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filterUnread
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare className="h-4 w-4 inline mr-1" />
                  Unread Messages
                </button>
                <button
                  onClick={() => setFilterPendingVideos(!filterPendingVideos)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filterPendingVideos
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Pending Videos
                </button>
                {(filterUnread || filterPendingVideos || searchQuery) && (
                  <button
                    onClick={() => {
                      setFilterUnread(false)
                      setFilterPendingVideos(false)
                      setSearchQuery('')
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                  >
                    <X className="h-4 w-4 inline mr-1" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('name')}
                  >
                    Client <SortIcon field="name" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('current_week')}
                  >
                    Current Week <SortIcon field="current_week" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('overall_rate')}
                  >
                    Overall Rate <SortIcon field="overall_rate" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('workouts')}
                  >
                    Workouts <SortIcon field="workouts" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('last_activity')}
                  >
                    Last Activity <SortIcon field="last_activity" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIcon field="status" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {clients.length === 0
                        ? 'No clients found'
                        : 'No clients match your filters'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedClients.map((client) => (
                    <tr key={client.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {client.profile_picture_url ? (
                              <img
                                src={client.profile_picture_url}
                                alt={client.first_name || 'Client'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 font-medium">
                                {(client.first_name?.[0] || client.username?.[0] || 'C').toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.first_name && client.last_name
                                ? `${client.first_name} ${client.last_name[0]}.`
                                : client.first_name || client.username || 'Client'}
                            </div>
                            {client.username && (
                              <div className="text-sm text-gray-500">@{client.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client.current_week_completed}/{client.current_week_commitment}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.current_week_completion_rate}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {client.overall_completion_rate}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {client.total_completed_sessions}/{client.total_commitment_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.total_completed_workouts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.last_message_at
                          ? new Date(client.last_message_at).toLocaleDateString()
                          : client.last_workout_date
                          ? new Date(client.last_workout_date).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {client.unread_messages_count > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {client.unread_messages_count} unread
                            </span>
                          )}
                          {client.pending_video_reviews > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {client.pending_video_reviews} videos
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/coach/clients/${client.user_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chat Panel - Messenger Style */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          showChat ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {!selectedChatUserId ? (
          /* Chat List View */
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {clients.length === 0 ? (
                <div className="text-center text-gray-500 py-8 px-6">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No clients found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {clients
                    .sort((a, b) => {
                      // Sort by unread count first, then by last message
                      if (a.unread_messages_count !== b.unread_messages_count) {
                        return b.unread_messages_count - a.unread_messages_count
                      }
                      if (a.last_message_at && b.last_message_at) {
                        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                      }
                      if (a.last_message_at) return -1
                      if (b.last_message_at) return 1
                      return 0
                    })
                    .map((client) => {
                      const clientName = client.first_name && client.last_name
                        ? `${client.first_name} ${client.last_name}`
                        : client.first_name || client.username || 'Client'
                      
                      return (
                        <button
                          key={client.user_id}
                          onClick={() => handleSelectChat(client.user_id)}
                          className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {client.profile_picture_url ? (
                                <img
                                  src={client.profile_picture_url}
                                  alt={clientName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-600 font-medium">
                                  {(client.first_name?.[0] || client.username?.[0] || 'C').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                  {clientName}
                                </h3>
                                {client.unread_messages_count > 0 && (
                                  <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                                    {client.unread_messages_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {client.username ? `@${client.username}` : client.email}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Conversation View */
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChatUserId(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {(() => {
                  const client = clients.find(c => c.user_id === selectedChatUserId)
                  const clientName = client?.first_name && client?.last_name
                    ? `${client.first_name} ${client.last_name}`
                    : client?.first_name || client?.username || 'Client'
                  
                  return (
                    <>
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {client?.profile_picture_url ? (
                          <img
                            src={client.profile_picture_url}
                            alt={clientName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium text-sm">
                            {(client?.first_name?.[0] || client?.username?.[0] || 'C').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                          {clientName}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {client?.username ? `@${client.username}` : client?.email}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-100">
              {!chatMessages[selectedChatUserId] ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chatMessages[selectedChatUserId].length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="mb-2">No messages yet.</p>
                  <p className="text-sm">Start a conversation with your client.</p>
                </div>
              ) : (
                chatMessages[selectedChatUserId].map((message, index) => {
                  const prevMessage = index > 0 ? chatMessages[selectedChatUserId][index - 1] : null
                  const nextMessage = index < chatMessages[selectedChatUserId].length - 1 ? chatMessages[selectedChatUserId][index + 1] : null
                  const isCoach = message.sender_type === 'coach'
                  const isSameSender = prevMessage && prevMessage.sender_id === message.sender_id && !isCoach
                  const timeDiff = prevMessage 
                    ? new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime()
                    : Infinity
                  const showAvatar = !isCoach && (!isSameSender || timeDiff > 300000)
                  const showTimestamp = !nextMessage || 
                    new Date(nextMessage.timestamp).getTime() - new Date(message.timestamp).getTime() > 300000 ||
                    nextMessage.sender_id !== message.sender_id
                  
                  const client = clients.find(c => c.user_id === selectedChatUserId)
                  const clientName = client?.first_name && client?.last_name
                    ? `${client.first_name} ${client.last_name}`
                    : client?.first_name || client?.username || 'Client'
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 mb-1 ${isCoach ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCoach && (
                        <div className="w-8 h-8 flex-shrink-0">
                          {showAvatar ? (
                            client?.profile_picture_url ? (
                              <img
                                src={client.profile_picture_url}
                                alt={clientName}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {(client?.first_name?.[0] || client?.username?.[0] || 'C').toUpperCase()}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="w-8" />
                          )}
                        </div>
                      )}
                      
                      <div className={`flex flex-col ${isCoach ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        {!isCoach && !isSameSender && (
                          <span className="text-xs text-gray-600 mb-1 px-1">
                            {clientName}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isCoach
                              ? 'bg-blue-500 text-white rounded-tr-sm'
                              : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                          }`}
                          style={{
                            borderRadius: isCoach 
                              ? '18px 18px 4px 18px' 
                              : '18px 18px 18px 4px'
                          }}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {message.message}
                          </p>
                        </div>
                        {showTimestamp && (
                          <span className={`text-xs mt-1 px-1 ${isCoach ? 'text-gray-500' : 'text-gray-500'}`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      
                      {isCoach && <div className="w-8 flex-shrink-0" />}
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 pr-12 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInputText.trim() || sendingMessage}
                  className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  aria-label="Send message"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay when chat is open on mobile */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setShowChat(false)}
        />
      )}
    </div>
  )
}

