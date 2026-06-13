'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, MessageSquare, User, Clock } from 'lucide-react'

interface CommentAuthor {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  profile_picture_url: string | null
}

interface PostAuthor extends CommentAuthor {}

interface PendingComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  status: string
  author: CommentAuthor
  post: {
    id: string
    content: string
    created_at: string
    post_author: PostAuthor
  }
}

interface GroupedPost {
  post: PendingComment['post']
  comments: PendingComment[]
}

export default function ModerationPage() {
  const [pending, setPending] = useState<PendingComment[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/admin/moderation/comments', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (res.ok) setPending(json.comments || [])
    } catch (err) {
      console.error('Error fetching pending comments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleAction = async (commentId: string, status: 'approved' | 'rejected') => {
    setActioning(commentId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/admin/moderation/comments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ commentId, status }),
      })

      if (res.ok) {
        setPending((prev) => prev.filter((c) => c.id !== commentId))
      }
    } catch (err) {
      console.error('Error actioning comment:', err)
    } finally {
      setActioning(null)
    }
  }

  const grouped = pending.reduce<GroupedPost[]>((acc, comment) => {
    const existing = acc.find((g) => g.post.id === comment.post_id)
    if (existing) {
      existing.comments.push(comment)
    } else {
      acc.push({ post: comment.post, comments: [comment] })
    }
    return acc
  }, [])

  const getDisplayName = (user: CommentAuthor) => {
    const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    return full || user.username || 'Unknown user'
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Comment Moderation</h1>
          <p className="text-gray-600 mt-1">
            Review and approve or reject pending comments before they are visible to all users.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-700">All caught up!</p>
            <p className="text-gray-500 text-sm mt-1">No comments are pending moderation.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              {pending.length} comment{pending.length !== 1 ? 's' : ''} pending across {grouped.length} post{grouped.length !== 1 ? 's' : ''}
            </p>

            {grouped.map(({ post, comments }) => (
              <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Post header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Post by {getDisplayName(post.post_author)}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                  </div>
                  <p className="text-gray-800 text-sm line-clamp-3">{post.content}</p>
                </div>

                {/* Pending comments */}
                <div className="divide-y divide-gray-100">
                  {comments.map((comment) => (
                    <div key={comment.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {comment.author.profile_picture_url ? (
                              <img
                                src={comment.author.profile_picture_url}
                                alt={getDisplayName(comment.author)}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {getDisplayName(comment.author)}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-gray-700 text-sm">{comment.content}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAction(comment.id, 'approved')}
                            disabled={actioning === comment.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-md transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(comment.id, 'rejected')}
                            disabled={actioning === comment.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-md transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
