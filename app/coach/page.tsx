'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import type { ClientMetrics, CoachProfile } from '@/lib/types/coach'
import Link from 'next/link'
import { Users, MessageSquare, TrendingUp, Calendar, AlertCircle, Search, ArrowUp, ArrowDown, X } from 'lucide-react'

type SortField = 'name' | 'current_week' | 'overall_rate' | 'workouts' | 'last_activity' | 'status'
type SortDirection = 'asc' | 'desc'

export default function CoachDashboard() {
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
          aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email
          bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email
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

  // Early return after all hooks have been called
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                {coachProfile?.name} • {clients.length} {clients.length === 1 ? 'client' : 'clients'}
              </p>
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
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                                {(client.first_name?.[0] || client.email[0]).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.first_name && client.last_name
                                ? `${client.first_name} ${client.last_name}`
                                : client.username || client.email}
                            </div>
                            <div className="text-sm text-gray-500">{client.email}</div>
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
    </div>
  )
}

