'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CoachService } from '@/lib/services/coachService'
import { ChatService } from '@/lib/services/chatService'
import type { CoachProfile, ClientMetrics, MoaiMetrics } from '@/lib/types/coach'
import type { ChatMessage, ChatSession } from '@/lib/services/chatService'
import type { MoaiChatMessage, MoaiChat } from '@/lib/services/chatService'
import { MessageSquare, Users, Search, Send, X, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react'

type ChatType = 'client' | 'moai'

interface ChatListItem {
  id: string
  type: ChatType
  name: string
  subtitle: string
  unreadCount: number
  lastMessageAt: string | null
  avatar?: string | null
  data: ClientMetrics | MoaiMetrics
}

export default function ChatPage() {
  const router = useRouter()
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientMetrics[]>([])
  const [moais, setMoais] = useState<MoaiMetrics[]>([])
  const [chatList, setChatList] = useState<ChatListItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null)
  
  // Client chat state
  const [clientChatSessions, setClientChatSessions] = useState<Record<string, ChatSession>>({})
  const [clientChatMessages, setClientChatMessages] = useState<Record<string, ChatMessage[]>>({})
  
  // Moai chat state
  const [moaiChats, setMoaiChats] = useState<Record<string, MoaiChat>>({})
  const [moaiChatMessages, setMoaiChatMessages] = useState<Record<string, MoaiChatMessage[]>>({})
  const [moaiDetails, setMoaiDetails] = useState<Record<string, any>>({})
  
  const [chatInputText, setChatInputText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showRecordOptions, setShowRecordOptions] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)
  const [recordedVideoPreview, setRecordedVideoPreview] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const isCancelingRef = useRef(false)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

      // Load clients and Moais in parallel
      const [clientsData, moaisData] = await Promise.all([
        CoachService.getClients(profile.id),
        CoachService.getMoais(profile.id),
      ])

      setClients(clientsData)
      setMoais(moaisData)

      // Build chat list
      const clientChats: ChatListItem[] = clientsData.map((client) => ({
        id: client.user_id,
        type: 'client' as ChatType,
        name: client.first_name && client.last_name
          ? `${client.first_name} ${client.last_name}`
          : client.first_name || client.username || client.email,
        subtitle: client.email,
        unreadCount: client.unread_messages_count || 0,
        lastMessageAt: client.last_message_at,
        avatar: client.profile_picture_url,
        data: client,
      }))

      const moaiChats: ChatListItem[] = moaisData.map((moai) => ({
        id: moai.moai_id,
        type: 'moai' as ChatType,
        name: moai.moai_name,
        subtitle: `${moai.member_count} ${moai.member_count === 1 ? 'member' : 'members'}`,
        unreadCount: moai.unread_messages_count || 0,
        lastMessageAt: moai.last_message_at,
        data: moai,
      }))

      // Combine and sort by last message time
      const allChats = [...clientChats, ...moaiChats].sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0
        if (!a.lastMessageAt) return 1
        if (!b.lastMessageAt) return -1
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      })

      setChatList(allChats)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load client chat
  const loadClientChat = async (userId: string) => {
    if (clientChatMessages[userId] || !coachProfile) return

    try {
      const session = await ChatService.getChatSession(userId, coachProfile.id)
      if (!session) return

      setClientChatSessions(prev => ({ ...prev, [userId]: session }))

      const messages = await ChatService.getMessages(session.id)
      setClientChatMessages(prev => ({ ...prev, [userId]: messages }))

      ChatService.subscribeToMessages(session.id, (newMessage) => {
        setClientChatMessages(prev => {
          const existing = prev[userId] || []
          if (existing.some(m => m.id === newMessage.id)) {
            return prev
          }
          return { ...prev, [userId]: [...existing, newMessage] }
        })
      })
    } catch (error) {
      console.error('Error loading client chat:', error)
    }
  }

  // Load Moai chat
  const loadMoaiChat = async (moaiId: string) => {
    if (moaiChatMessages[moaiId] || !coachProfile) return

    try {
      const detail = await CoachService.getMoaiDetail(moaiId, coachProfile.id)
      if (!detail) return

      setMoaiDetails(prev => ({ ...prev, [moaiId]: detail }))

      const chat = await ChatService.getMoaiChat(moaiId)
      if (!chat) return

      setMoaiChats(prev => ({ ...prev, [moaiId]: chat }))

      const messages = await ChatService.getMoaiChatMessages(
        chat.id,
        detail.coach_subscription_started_at
      )
      setMoaiChatMessages(prev => ({ ...prev, [moaiId]: messages }))

      ChatService.subscribeToMoaiChatMessages(
        chat.id,
        detail.coach_subscription_started_at,
        (newMessage) => {
          setMoaiChatMessages(prev => {
            const existing = prev[moaiId] || []
            if (existing.some(m => m.id === newMessage.id)) {
              return prev
            }
            return { ...prev, [moaiId]: [...existing, newMessage] }
          })
        }
      )
    } catch (error) {
      console.error('Error loading Moai chat:', error)
    }
  }

  // Handle selecting a chat
  const handleSelectChat = (chat: ChatListItem) => {
    setSelectedChat(chat)
    if (chat.type === 'client') {
      loadClientChat(chat.id)
    } else {
      loadMoaiChat(chat.id)
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      alert('Please select an image or video file')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedMedia({
        file,
        preview: reader.result as string,
        type: isImage ? 'image' : 'video'
      })
    }
    reader.readAsDataURL(file)
  }

  // Open record modal and get camera access
  const openRecordModal = async () => {
    try {
      // Close the options menu first
      setShowRecordOptions(false)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      })
      
      // Set stream and show modal, but don't start recording yet
      setMediaStream(stream)
      setShowRecordModal(true)
      setIsRecording(false)

      // Set up media recorder (but don't start yet)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Don't process if we're canceling
        if (isCancelingRef.current) {
          return
        }

        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' })
        setRecordedVideo(blob)
        
        // Create preview URL - this will be revoked when modal closes or new recording starts
        const previewUrl = URL.createObjectURL(blob)
        setRecordedVideoPreview(previewUrl)

        // Stop camera preview but keep modal open
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null
        }
        stream.getTracks().forEach(track => track.stop())
        setMediaStream(null)
        setIsRecording(false)
      }

      // Set up video preview after a short delay to ensure modal is mounted
      setTimeout(() => {
        if (videoPreviewRef.current && stream) {
          try {
            videoPreviewRef.current.srcObject = stream
            const playPromise = videoPreviewRef.current.play()
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                // Ignore AbortError - it's expected if component unmounts or stream stops
                if (err.name !== 'AbortError') {
                  console.error('Error playing video:', err)
                }
              })
            }
          } catch (err: any) {
            // Ignore errors if element is no longer available
            if (err.name !== 'AbortError') {
              console.error('Error setting up video:', err)
            }
          }
        }
      }, 200)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
      setShowRecordOptions(false)
      setShowRecordModal(false)
      setIsRecording(false)
      setMediaStream(null)
    }
  }

  // Start recording (called from modal)
  const startRecording = () => {
    if (!mediaStream || !mediaRecorderRef.current) return

    setIsRecording(true)
    recordingChunksRef.current = []
    isCancelingRef.current = false

    if (mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start()
    }
  }

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    // Don't stop the stream here - let onstop handler do it after creating preview
  }

  // Attach recorded video to chat
  const attachRecordedVideo = () => {
    if (recordedVideo && recordedVideoPreview) {
      // Create a File object from the blob
      const file = new File([recordedVideo], `recording-${Date.now()}.webm`, { type: 'video/webm' })
      
      // Create a new data URL for the preview (since we'll revoke the blob URL)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedMedia({
          file,
          preview: reader.result as string,
          type: 'video'
        })
        // Close modal and clear recording state
        setShowRecordModal(false)
        setRecordedVideo(null)
        // Revoke blob URL after creating data URL
        URL.revokeObjectURL(recordedVideoPreview)
        setRecordedVideoPreview(null)
      }
      reader.readAsDataURL(recordedVideo)
    }
  }

  // Record again (start over)
  const recordAgain = async () => {
    // Clean up previous recording
    if (recordedVideoPreview) {
      URL.revokeObjectURL(recordedVideoPreview)
      setRecordedVideoPreview(null)
    }
    setRecordedVideo(null)
    recordingChunksRef.current = []
    
    // Get camera access again
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      })
      
      setMediaStream(stream)
      
      // Set up media recorder again
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (isCancelingRef.current) {
          return
        }

        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' })
        setRecordedVideo(blob)
        
        const previewUrl = URL.createObjectURL(blob)
        setRecordedVideoPreview(previewUrl)

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null
        }
        stream.getTracks().forEach(track => track.stop())
        setMediaStream(null)
        setIsRecording(false)
      }

      // Set up video preview
      setTimeout(() => {
        if (videoPreviewRef.current && stream) {
          try {
            videoPreviewRef.current.srcObject = stream
            videoPreviewRef.current.play().catch(err => {
              if (err.name !== 'AbortError') {
                console.error('Error playing video:', err)
              }
            })
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error('Error setting up video:', err)
            }
          }
        }
      }, 200)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  // Cancel recording
  const cancelRecording = () => {
    // Set cancel flag to prevent processing
    isCancelingRef.current = true
    
    // Stop the media recorder if it's running
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Clear the onstop handler to prevent processing
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      } catch (err) {
        // Ignore errors if already stopped
      }
    }
    
    // Stop all media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }
    
    // Clean up preview URL if exists
    if (recordedVideoPreview) {
      URL.revokeObjectURL(recordedVideoPreview)
    }
    
    // Clear all recording state
    setIsRecording(false)
    setRecordedVideo(null)
    setRecordedVideoPreview(null)
    setSelectedMedia(null)
    setShowRecordOptions(false)
    setShowRecordModal(false)
    
    // Clear video preview
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null
    }
    
    // Clear the media recorder reference and chunks
    mediaRecorderRef.current = null
    recordingChunksRef.current = []
  }

  // Send message
  const handleSendMessage = async () => {
    if ((!chatInputText.trim() && !selectedMedia) || !selectedChat || !coachProfile || sendingMessage || uploadingMedia) return

    setSendingMessage(true)
    let mediaUrl: string | null = null
    let mediaType: 'image' | 'video' | null = null

    try {
      // Upload media if selected
      if (selectedMedia) {
        setUploadingMedia(true)
        try {
          const sessionIdOrChatId = selectedChat.type === 'client' 
            ? clientChatSessions[selectedChat.id]?.id || selectedChat.id
            : moaiChats[selectedChat.id]?.id || selectedChat.id
          
          mediaUrl = await ChatService.uploadChatMedia(
            selectedMedia.file,
            sessionIdOrChatId,
            selectedChat.type
          )
          mediaType = selectedMedia.type

          if (!mediaUrl) {
            alert('Failed to upload media. Please try again.')
            setUploadingMedia(false)
            setSendingMessage(false)
            return
          }
        } catch (error: any) {
          alert(error.message || 'Failed to upload media. Please try again.')
          setUploadingMedia(false)
          setSendingMessage(false)
          return
        } finally {
          setUploadingMedia(false)
        }
      }

      // Send message
      if (selectedChat.type === 'client') {
        const session = clientChatSessions[selectedChat.id]
        if (!session) return

        const newMessage = await ChatService.sendMessage(
          session.id,
          coachProfile.id,
          chatInputText.trim() || (mediaUrl ? (mediaType === 'image' ? '📷 Image' : '🎥 Video') : ''),
          undefined,
          mediaUrl,
          mediaType
        )
        if (newMessage) {
          setClientChatMessages(prev => ({
            ...prev,
            [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage]
          }))
          setChatInputText('')
          setSelectedMedia(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        const chat = moaiChats[selectedChat.id]
        if (!chat) return

        const newMessage = await ChatService.sendMoaiChatMessage(
          chat.id,
          coachProfile.user_id!,
          chatInputText.trim() || (mediaUrl ? (mediaType === 'image' ? '📷 Image' : '🎥 Video') : ''),
          undefined,
          mediaUrl,
          mediaType
        )
        if (newMessage) {
          setMoaiChatMessages(prev => ({
            ...prev,
            [selectedChat.id]: [...(prev[selectedChat.id] || []), newMessage]
          }))
          setChatInputText('')
          setSelectedMedia(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [clientChatMessages, moaiChatMessages, selectedChat])

  // Cleanup media stream only on unmount or chat change (not when mediaStream changes)
  useEffect(() => {
    return () => {
      // Only cleanup if we're switching chats or unmounting
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null
      }
    }
  }, [selectedChat]) // Only depend on selectedChat, not mediaStream

  // Filter chat list
  const filteredChats = chatList.filter((chat) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return chat.name.toLowerCase().includes(query) || chat.subtitle.toLowerCase().includes(query)
  })

  const currentMessages = selectedChat
    ? selectedChat.type === 'client'
      ? clientChatMessages[selectedChat.id] || []
      : moaiChatMessages[selectedChat.id] || []
    : []

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  // Show skeleton/loading state inline instead of full screen

  return (
    <div className="flex h-[calc(100vh-0px)] bg-gray-50">
      {/* Chat List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Chats</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredChats.map((chat) => (
                <button
                  key={`${chat.type}-${chat.id}`}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedChat?.id === chat.id && selectedChat?.type === chat.type
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {chat.avatar ? (
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {chat.type === 'moai' ? (
                          <Users className="h-6 w-6 text-gray-500" />
                        ) : (
                          <MessageSquare className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                        {chat.lastMessageAt && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTime(chat.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{chat.subtitle}</p>
                      {chat.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedChat.avatar ? (
                    <img
                      src={selectedChat.avatar}
                      alt={selectedChat.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {selectedChat.type === 'moai' ? (
                        <Users className="h-5 w-5 text-gray-500" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedChat.name}</h2>
                    <p className="text-sm text-gray-600">{selectedChat.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  currentMessages.map((message: any) => {
                    const isCoach = message.is_coach || message.sender_type === 'coach'
                    const senderName = message.sender_name || (isCoach ? 'You' : message.sender_username || 'User')
                    const senderAvatar = message.sender_profile_picture_url

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${isCoach ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isCoach && (
                          <>
                            {senderAvatar ? (
                              <img
                                src={senderAvatar}
                                alt={senderName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-gray-600 text-xs font-medium">
                                  {senderName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div className={`max-w-md ${isCoach ? 'order-2' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-700">{senderName}</span>
                            <span className="text-xs text-gray-500">
                              {formatTime(message.timestamp || message.created_at)}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isCoach
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            {(message.media_url || (message as any).media_url) && (
                              <div className="mb-2">
                                {(message.media_type || (message as any).media_type) === 'image' ? (
                                  <img
                                    src={message.media_url || (message as any).media_url}
                                    alt="Shared image"
                                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(message.media_url || (message as any).media_url, '_blank')}
                                  />
                                ) : (
                                  <video
                                    src={message.media_url || (message as any).media_url}
                                    controls
                                    className="max-w-xs rounded-lg"
                                  />
                                )}
                              </div>
                            )}
                            {message.message && (
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            )}
                          </div>
                        </div>
                        {isCoach && (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">C</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              {selectedMedia && !isRecording && (
                <div className="mb-2 relative">
                  <button
                    onClick={() => {
                      setSelectedMedia(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {selectedMedia.type === 'image' ? (
                    <img
                      src={selectedMedia.preview}
                      alt="Preview"
                      className="max-w-xs rounded-lg"
                    />
                  ) : (
                    <video
                      src={selectedMedia.preview}
                      controls
                      className="max-w-xs rounded-lg"
                    />
                  )}
                </div>
              )}
              
              {/* Recording Modal */}
              {showRecordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                  <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl pointer-events-auto" style={{ width: '640px', maxWidth: '90vw', aspectRatio: '16/9' }}>
                    <button
                      onClick={cancelRecording}
                      className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    
                    {/* Camera Preview (when not showing recorded video) */}
                    {!recordedVideoPreview && (
                      <>
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        {isRecording && (
                          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            <span className="font-medium">Recording</span>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                          {!isRecording ? (
                            <button
                              onClick={startRecording}
                              className="bg-red-500 text-white px-6 py-3 rounded-full text-base font-medium hover:bg-red-600 shadow-lg"
                            >
                              Start Recording
                            </button>
                          ) : (
                            <button
                              onClick={stopRecording}
                              className="bg-white text-gray-900 px-6 py-3 rounded-full text-base font-medium hover:bg-gray-100 shadow-lg"
                            >
                              Stop Recording
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* Recorded Video Preview */}
                    {recordedVideoPreview && (
                      <>
                        <video
                          src={recordedVideoPreview}
                          controls
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                          <button
                            onClick={recordAgain}
                            className="bg-gray-500 text-white px-6 py-3 rounded-full text-base font-medium hover:bg-gray-600 shadow-lg"
                          >
                            Record Again
                          </button>
                          <button
                            onClick={attachRecordedVideo}
                            className="bg-blue-600 text-white px-6 py-3 rounded-full text-base font-medium hover:bg-blue-700 shadow-lg"
                          >
                            Attach to Chat
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Record Options Menu */}
              {showRecordOptions && (
                <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRecordOptions(false)
                        fileInputRef.current?.click()
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Upload File
                    </button>
                    <button
                      onClick={openRecordModal}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Record Video
                    </button>
                    <button
                      onClick={() => setShowRecordOptions(false)}
                      className="px-3 py-2 text-gray-600 hover:text-gray-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowRecordOptions(!showRecordOptions)}
                    disabled={uploadingMedia || sendingMessage || isRecording}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach image or video"
                  >
                    {uploadingMedia ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploadingMedia}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!chatInputText.trim() && !selectedMedia) || sendingMessage || uploadingMedia}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a chat</h3>
              <p className="text-gray-600">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
