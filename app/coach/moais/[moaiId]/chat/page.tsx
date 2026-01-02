'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChatService } from '@/lib/services/chatService'
import { CoachService } from '@/lib/services/coachService'
import type { MoaiChatMessage, MoaiChat } from '@/lib/services/chatService'
import type { CoachProfile, MoaiDetail } from '@/lib/types/coach'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'

export default function MoaiChatPage() {
  const params = useParams()
  const router = useRouter()
  const moaiId = params.moaiId as string

  const [moaiDetail, setMoaiDetail] = useState<MoaiDetail | null>(null)
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<MoaiChatMessage[]>([])
  const [chat, setChat] = useState<MoaiChat | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [moaiId])

  const loadData = async () => {
    try {
      setLoading(true)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.push('/coach/login')
        return
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(session.user.id)
      if (!profile) {
        router.push('/')
        return
      }

      setCoachProfile(profile)

      // Get Moai detail
      const detail = await CoachService.getMoaiDetail(moaiId, profile.id)
      if (!detail) {
        router.push('/coach/moais')
        return
      }

      setMoaiDetail(detail)

      // Load chat
      let unsubscribe: (() => void) | null = null

      const moaiChat = await ChatService.getMoaiChat(moaiId)
      if (!moaiChat) {
        console.error('Moai chat not found')
        setLoading(false)
        return
      }

      setChat(moaiChat)
      const chatMessages = await ChatService.getMoaiChatMessages(
        moaiChat.id,
        detail.coach_subscription_started_at
      )
      setMessages(chatMessages)

      // Subscribe to new messages in real-time
      unsubscribe = ChatService.subscribeToMoaiChatMessages(
        moaiChat.id,
        detail.coach_subscription_started_at,
        (newMessage) => {
          console.log('New message received:', newMessage)
          setMessages((prev) => {
            // Check if message already exists (avoid duplicates)
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )

      // Cleanup function
      return () => {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    } catch (error) {
      console.error('Error loading chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputText.trim() || !chat || !coachProfile?.user_id || sending) return

    setSending(true)
    try {
      const newMessage = await ChatService.sendMoaiChatMessage(
        chat.id,
        coachProfile.user_id,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/coach/moais/${moaiId}`}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {moaiDetail?.name || 'Moai Chat'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">Chat with Moai members</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {!chat ? (
          <div className="bg-white rounded-lg shadow p-8 text-center flex items-center justify-center flex-1">
            <p className="text-gray-600">Chat not available</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow flex flex-col flex-1 min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                          className="h-8 w-8 rounded-full flex-shrink-0"
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
        )}
      </div>
    </div>
  )
}

