'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import type { CoachProfile } from '@/lib/types/coach'
import { Trophy, Users, TrendingUp, Calendar } from 'lucide-react'

interface CommunityPost {
  id: string
  content: string
  media_path: string | null
  media_type: string | null
  created_at: string
  updated_at: string
  user_id: string
  users: {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    profile_picture_url: string | null
  } | null
}

interface LeaderboardEntry {
  moai_id: string
  moai_name: string
  member_count: number
  total_workouts: number
  total_completed: number
  total_commitment: number
  completion_rate: number
}

export default function CommunityPage() {
  const router = useRouter()
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        window.location.href = '/coach/login'
        return
      }

      const profile = await CoachService.getCoachProfileByUserId(session.user.id)
      if (!profile) {
        window.location.href = '/'
        return
      }

      setCoachProfile(profile)

      // Load posts and leaderboard in parallel
      const [postsData, leaderboardData] = await Promise.all([
        CoachService.getCommunityPosts(20),
        CoachService.getMoaiLeaderboard(10),
      ])

      setPosts(postsData)
      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
      setLoadingPosts(false)
      setLoadingLeaderboard(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getUserDisplayName = (post: CommunityPost) => {
    if (post.users) {
      if (post.users.first_name && post.users.last_name) {
        return `${post.users.first_name} ${post.users.last_name}`
      }
      return post.users.first_name || post.users.username || 'User'
    }
    return 'User'
  }

  // Show skeleton/loading state inline instead of full screen

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
        <p className="text-gray-600 mb-8">
          Stay connected with the Moai community and see top-performing groups.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Blog Posts Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Posts</h2>

              {loadingPosts ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No posts yet. Check back soon!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-start gap-4">
                        {post.users?.profile_picture_url ? (
                          <img
                            src={post.users.profile_picture_url}
                            alt={getUserDisplayName(post)}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">
                              {getUserDisplayName(post)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(post.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap mb-3">
                            {post.content}
                          </p>
                          {post.media_path && post.media_type === 'image' && (
                            <img
                              src={post.media_path}
                              alt="Post media"
                              className="rounded-lg max-w-full h-auto"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold text-gray-900">Moai Leaderboard</h2>
              </div>

              {loadingLeaderboard ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No Moais to display yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.moai_id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : index === 1
                                ? 'bg-gray-100 text-gray-700'
                                : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <h3 className="font-semibold text-gray-900">{entry.moai_name}</h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{entry.member_count} members</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>{entry.total_workouts} workouts</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Completion Rate</span>
                          <span className="font-semibold text-gray-900">
                            {entry.completion_rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(entry.completion_rate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
