'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import type { MoaiMetrics, CoachProfile } from '@/lib/types/coach'
import Link from 'next/link'
import { Users, MessageSquare, TrendingUp, Calendar, ArrowRight, Search, X, LogOut } from 'lucide-react'

export default function MoaisPage() {
  const router = useRouter()
  const [moais, setMoais] = useState<MoaiMetrics[]>([])
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadMoais()
  }, [])

  const loadMoais = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        window.location.href = '/coach/login'
        return
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(session.user.id)
      if (!profile) {
        window.location.href = '/'
        return
      }

      setCoachProfile(profile)

      // Get Moais
      const moaisData = await CoachService.getMoais(profile.id)
      setMoais(moaisData)
    } catch (error) {
      console.error('Error loading Moais:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMoais = moais.filter((moai) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return moai.moai_name.toLowerCase().includes(query)
  })

  const totalUnread = moais.reduce((sum, moai) => sum + moai.unread_messages_count, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Moais...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Moais</h1>
              <p className="text-sm text-gray-600 mt-1">
                {coachProfile?.name} • {moais.length} {moais.length === 1 ? 'Moai' : 'Moais'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {totalUnread > 0 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">{totalUnread} unread</span>
                </div>
              )}
              <Link
                href="/coach"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <span>Clients</span>
              </Link>
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
                <p className="text-sm font-medium text-gray-600">Total Moais</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{moais.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moais.reduce((sum, m) => sum + m.member_count, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moais.length > 0
                    ? (
                        moais.reduce((sum, m) => sum + m.overall_completion_rate, 0) /
                        moais.length
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnread}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Moais List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Moai Groups</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredMoais.length} of {moais.length}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Moais..."
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
          </div>

          <div className="divide-y divide-gray-200">
            {filteredMoais.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                {moais.length === 0
                  ? 'No Moais found'
                  : 'No Moais match your search'}
              </div>
            ) : (
              filteredMoais.map((moai) => (
                <Link
                  key={moai.moai_id}
                  href={`/coach/moais/${moai.moai_id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {moai.moai_name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            moai.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : moai.status === 'forming'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {moai.status}
                        </span>
                        {moai.unread_messages_count > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {moai.unread_messages_count} unread
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Members:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {moai.member_count}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Current Week:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {moai.current_week_completed}/{moai.current_week_commitment} (
                            {moai.current_week_completion_rate.toFixed(0)}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Overall Rate:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {moai.overall_completion_rate.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Workouts:</span>{' '}
                          <span className="font-medium text-gray-900">
                            {moai.total_workouts}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 ml-4" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

