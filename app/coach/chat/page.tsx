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

// Video player component that handles content type issues
function VideoPlayer({ src, messageId }: { src: string; messageId: string }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // If src is already a blob URL, use it directly
    if (src.startsWith('blob:')) {
      console.log("Using existing blob URL:", src)
      setVideoUrl(src)
      setLoading(false)
      return
    }

    // Try to fetch the video and create a blob URL with correct content type
    let blobUrl: string | null = null
    setLoading(true)
    setError(null)
    
    const loadVideo = async () => {
      try {
        // Use regular fetch for all URLs - public URLs should work directly
        // If the file is stored correctly, this will be raw binary video data
        const response = await fetch(src, {
          method: 'GET',
          headers: { 
            'Accept': 'video/*,application/octet-stream,*/*',
          },
          cache: 'no-cache'
        })
        
        if (!response.ok) {
          setError(`Failed to load video: ${response.statusText}`)
          setLoading(false)
          return
        }
        
        // Get content type from response headers
        let contentType = response.headers.get('content-type') || 'video/webm'
        
        // If content type is wrong, determine from file extension
        if (!contentType.startsWith('video/')) {
          const fileExt = src.split('.').pop()?.toLowerCase()
          if (fileExt === 'mp4') {
            contentType = 'video/mp4'
          } else if (fileExt === 'webm') {
            contentType = 'video/webm'
          } else if (fileExt === 'mov') {
            contentType = 'video/quicktime'
          }
        }
        
        const arrayBuffer = await response.arrayBuffer()
        
        console.log("Video fetch test:", {
          url: src,
          contentType,
          arrayBufferSize: arrayBuffer.byteLength
        })
        
        // Check if array buffer is empty
        if (arrayBuffer.byteLength === 0) {
          console.error("Video fetch returned empty array buffer")
          setError('Video file is empty')
          setLoading(false)
          return
        }

        // Validate and create blob from array buffer
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Check for multipart/form-data - old files might be stored incorrectly
        const firstBytesText = String.fromCharCode(...uint8Array.slice(0, Math.min(50, uint8Array.length)))
        const isMultipart = firstBytesText.includes('--') && (firstBytesText.includes('WebKitFormBoundary') || firstBytesText.includes('form-data'))
        
        if (isMultipart) {
          console.warn("⚠️ Video file appears to be stored as multipart/form-data. This file may not play correctly. Re-upload the video to fix this.")
          setError('This video was stored incorrectly and cannot be played. Please re-upload the video.')
          setLoading(false)
          return
        }
        
        // Check first few bytes to see if it's JSON (starts with '{' or '[')
        const firstBytes = String.fromCharCode(...uint8Array.slice(0, Math.min(10, uint8Array.length)))
        const isLikelyJSON = firstBytes.trim().startsWith('{') || firstBytes.trim().startsWith('[')
        
        if (isLikelyJSON) {
          // Try to parse as JSON
          try {
            const text = new TextDecoder().decode(arrayBuffer)
            const jsonData = JSON.parse(text)
            console.error("Server returned JSON instead of video:", jsonData)
            setError(`Server error: ${jsonData.message || jsonData.error || 'Invalid response'}`)
            setLoading(false)
            return
          } catch {
            // Not valid JSON, continue
          }
        }
        
        // Log first bytes to debug what we're actually getting
        const first20BytesHex = Array.from(uint8Array.slice(0, Math.min(20, uint8Array.length)))
          .map(b => '0x' + b.toString(16).padStart(2, '0'))
          .join(' ')
        
        console.log("Video data downloaded:", {
          size: arrayBuffer.byteLength,
          contentType,
          firstBytesHex: first20BytesHex
        })
        
        // Check for valid video file signatures
        // WebM signature: 0x1A 0x45 0xDF 0xA3 (EBML header)
        const webmSignature = uint8Array[0] === 0x1A && uint8Array[1] === 0x45 && uint8Array[2] === 0xDF && uint8Array[3] === 0xA3
        // MP4 signature: "ftyp" at offset 4
        const mp4Signature = uint8Array.length > 8 && 
                             uint8Array[4] === 0x66 && 
                             uint8Array[5] === 0x74 && 
                             uint8Array[6] === 0x79 && 
                             uint8Array[7] === 0x70
        
        // Determine final type from URL extension or signatures
        let finalType = contentType
        if (!finalType || finalType === 'application/json') {
          if (src.includes('.webm') || webmSignature) {
            finalType = 'video/webm'
          } else if (src.includes('.mp4') || mp4Signature) {
            finalType = 'video/mp4'
          } else if (src.includes('.mov')) {
            finalType = 'video/quicktime'
          } else {
            finalType = 'video/webm' // Default
          }
        }
        
        // If we have the right file extension but wrong signature, still try to use it
        // Sometimes the signature check might fail due to how the data was downloaded
        if (src.includes('.webm') && !webmSignature && !mp4Signature && !isLikelyJSON) {
          console.warn("WebM file but signature check failed - using video/webm type anyway")
          finalType = 'video/webm'
        }
        
        // Create blob with correct type
        const finalBlob = new Blob([arrayBuffer], { type: finalType })
        
        console.log("Creating blob from array buffer:", {
          blobSize: arrayBuffer.byteLength,
          contentType: contentType,
          finalType: finalType,
          hasWebmSignature: webmSignature,
          hasMp4Signature: mp4Signature,
          isLikelyJSON: isLikelyJSON,
          firstBytesHex: first20BytesHex
        })
        
        // Validate blob size
        if (finalBlob.size === 0) {
          console.error("Created blob is empty!")
          setError('Video file is empty')
          setLoading(false)
          return
        }
        
        blobUrl = URL.createObjectURL(finalBlob)
        
        console.log("Video blob URL created:", {
          blobUrl: blobUrl.substring(0, 50) + '...',
          type: finalBlob.type,
          originalServerType: contentType,
          blobSize: finalBlob.size,
          arrayBufferSize: arrayBuffer.byteLength
        })
        
        setVideoUrl(blobUrl)
        setLoading(false)
      } catch (err: any) {
        console.error("Error loading video:", err)
        setError(err.message || 'Failed to load video')
        setLoading(false)
      }
    }

    loadVideo()
    
    // Cleanup blob URL on unmount or when src changes
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [src])

  if (loading) {
    return (
      <div className="max-w-xs rounded-lg bg-gray-100 p-4 text-sm text-gray-600 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading video...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xs rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
        Video unavailable: {error}
        <br />
        <a 
          href={src} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Open in new tab
        </a>
      </div>
    )
  }

  if (!videoUrl) {
    return (
      <div className="max-w-xs rounded-lg bg-gray-100 p-4 text-sm text-gray-600">
        Video URL not available
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      className="max-w-xs rounded-lg"
      preload="auto"
      playsInline
      crossOrigin="anonymous"
      onError={(e) => {
        const videoEl = e.currentTarget;
        const err = videoEl.error;
        
        // Build error object with fallbacks
        const errorInfo: any = {
          src: videoUrl,
          originalSrc: src,
          errorExists: !!err,
          networkState: videoEl.networkState,
          readyState: videoEl.readyState,
          videoWidth: videoEl.videoWidth,
          videoHeight: videoEl.videoHeight,
          duration: videoEl.duration,
          blobUrlType: videoUrl.startsWith('blob:') ? 'blob' : 'direct'
        };
        
        if (err) {
          errorInfo.errorCode = err.code;
          errorInfo.errorMessage = err.message;
          errorInfo.mediaErrorType = err.constructor?.name || 'MediaError';
        } else {
          errorInfo.note = 'Video error occurred but MediaError object is null/undefined';
        }
        
        console.error("Video element error:", errorInfo);
        
        // Try to get more detailed error info
        let errorMsg = 'Unknown error'
        if (err) {
          switch (err.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMsg = 'Video playback aborted'
              break
            case MediaError.MEDIA_ERR_NETWORK:
              errorMsg = 'Network error loading video'
              break
            case MediaError.MEDIA_ERR_DECODE:
              errorMsg = 'Video decode error - file may be corrupted or format not supported. The video file may be stored incorrectly (multipart/form-data instead of raw binary).'
              break
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg = 'Video format not supported by browser'
              break
            default:
              errorMsg = `Media error code: ${err.code}`
          }
        } else {
          errorMsg = 'Video failed to load (no error details available) - file may be corrupted or in wrong format'
        }
        
        setError(`Video error: ${errorMsg} ${err ? `(Code: ${err.code})` : ''}`);
      }}
      onLoadStart={() => {
        console.log("Video loading:", videoUrl);
      }}
      onLoadedMetadata={() => {
        console.log("Video metadata loaded:", {
          duration: videoRef.current?.duration,
          videoWidth: videoRef.current?.videoWidth,
          videoHeight: videoRef.current?.videoHeight,
          readyState: videoRef.current?.readyState
        });
      }}
      onCanPlay={() => {
        console.log("Video can play:", videoUrl);
      }}
      onLoadedData={() => {
        console.log("Video data loaded");
      }}
    />
  )
}

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
  const recordingMimeTypeRef = useRef<string>('video/webm')
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
      // Prefer WebM over MP4 - WebM is more widely supported and produces reliable output
      // MP4 recording in browsers is experimental and often produces files that can't be played back
      let mimeType = 'video/webm'
      const codecs = [
        // Prefer WebM - it's more reliable for browser recording
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        // MP4 is less reliable but include as fallback
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4'
      ]
      
      for (const codec of codecs) {
        if (MediaRecorder.isTypeSupported(codec)) {
          mimeType = codec
          console.log('Using codec:', codec)
          break
        }
      }
      
      // Store mimeType in ref so it's available in onstop handler
      recordingMimeTypeRef.current = mimeType
      
      console.log('MediaRecorder setup:', {
        supportedCodecs: codecs.filter(c => MediaRecorder.isTypeSupported(c)),
        selectedCodec: mimeType
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log('Received data chunk:', {
            size: e.data.size,
            type: e.data.type,
            totalChunks: recordingChunksRef.current.length + 1
          })
          recordingChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Don't process if we're canceling
        if (isCancelingRef.current) {
          console.log('Recording canceled, not processing chunks')
          recordingChunksRef.current = []
          return
        }

        console.log('Recording stopped, creating blob from chunks:', {
          chunkCount: recordingChunksRef.current.length,
          totalSize: recordingChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          mimeType: recordingMimeTypeRef.current
        })

        if (recordingChunksRef.current.length === 0) {
          console.error('No recording chunks available!')
          alert('Recording failed: No data was captured. Please try again.')
          return
        }

        // Use the same mimeType that was used for recording
        const blob = new Blob(recordingChunksRef.current, { type: recordingMimeTypeRef.current })
        
        console.log('Blob created:', {
          size: blob.size,
          type: blob.type
        })

        if (blob.size === 0) {
          console.error('Created blob is empty!')
          alert('Recording failed: Video file is empty. Please try again.')
          return
        }

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
      // Start recording with 1 second timeslice to ensure chunks are collected reliably
      // Without timeslice, some browsers may not fire ondataavailable events properly
      mediaRecorderRef.current.start(1000)
      console.log('Recording started with timeslice: 1000ms')
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
      // Verify the blob has data
      if (recordedVideo.size === 0) {
        console.error('Cannot attach: recorded video blob is empty!')
        alert('Recording is empty. Please record again.')
        return
      }

      console.log('Attaching recorded video:', {
        blobSize: recordedVideo.size,
        blobType: recordedVideo.type
      })

      // Determine file extension and type based on the blob's mimeType
      // Check actual blob type, but also verify it's valid
      const blobType = recordedVideo.type || ''
      const isMP4 = blobType.includes('mp4') && blobType.includes('video')
      const isWebM = blobType.includes('webm') && blobType.includes('video')
      
      // Default to webm if type is unclear, but prioritize detected type if valid
      const extension = isMP4 ? 'mp4' : 'webm'
      let mimeType = isMP4 ? 'video/mp4' : 'video/webm'
      
      // Ensure mimeType is correct - never use application/json or generic types
      if (!blobType.includes('video') || blobType === 'application/json' || blobType === 'application/octet-stream') {
        // Force correct video mime type based on extension
        mimeType = extension === 'mp4' ? 'video/mp4' : 'video/webm'
        console.warn('Recorded video blob had invalid type, forcing correct mime type:', {
          originalBlobType: blobType,
          forcedMimeType: mimeType,
          extension
        })
      }
      
      // Create a File object from the blob with explicit correct type
      const file = new File([recordedVideo], `recording-${Date.now()}.${extension}`, { type: mimeType })
      
      console.log('File created for upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      
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
      // Prefer WebM over MP4 - WebM is more widely supported and produces reliable output
      let mimeType = 'video/webm'
      const codecs = [
        // Prefer WebM - it's more reliable for browser recording
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        // MP4 is less reliable but include as fallback
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4'
      ]
      
      for (const codec of codecs) {
        if (MediaRecorder.isTypeSupported(codec)) {
          mimeType = codec
          break
        }
      }
      
      // Store mimeType in ref so it's available in onstop handler
      recordingMimeTypeRef.current = mimeType
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          console.log('Received data chunk (recordAgain):', {
            size: e.data.size,
            type: e.data.type,
            totalChunks: recordingChunksRef.current.length + 1
          })
          recordingChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (isCancelingRef.current) {
          console.log('Recording canceled (recordAgain), not processing chunks')
          recordingChunksRef.current = []
          return
        }

        console.log('Recording stopped (recordAgain), creating blob from chunks:', {
          chunkCount: recordingChunksRef.current.length,
          totalSize: recordingChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          mimeType: recordingMimeTypeRef.current
        })

        if (recordingChunksRef.current.length === 0) {
          console.error('No recording chunks available (recordAgain)!')
          alert('Recording failed: No data was captured. Please try again.')
          return
        }

        // Use the same mimeType that was used for recording
        const blob = new Blob(recordingChunksRef.current, { type: recordingMimeTypeRef.current })
        
        console.log('Blob created (recordAgain):', {
          size: blob.size,
          type: blob.type
        })

        if (blob.size === 0) {
          console.error('Created blob is empty (recordAgain)!')
          alert('Recording failed: Video file is empty. Please try again.')
          return
        }

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
    console.log('Canceling recording:', {
      isRecording,
      hasRecorder: !!mediaRecorderRef.current,
      recorderState: mediaRecorderRef.current?.state,
      hasRecordedVideo: !!recordedVideo
    })

    // Set cancel flag to prevent processing
    isCancelingRef.current = true
    
    // Clear chunks immediately to prevent them from being used
    recordingChunksRef.current = []
    
    // Stop the media recorder if it's running
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Clear the onstop handler to prevent processing
        mediaRecorderRef.current.onstop = null
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (err) {
        // Ignore errors if already stopped
        console.log('Error stopping recorder (expected if already stopped):', err)
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
          console.log("New message added to state:", {
            id: newMessage.id,
            media_url: newMessage.media_url,
            media_type: newMessage.media_type,
            media_storage_path: (newMessage as any).media_storage_path,
            fullMessage: newMessage
          });
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
                            {(() => {
                              const msgMediaUrl = message.media_url || (message as any).media_url;
                              const msgMediaType = message.media_type || (message as any).media_type;
                              const msgStoragePath = (message as any).media_storage_path;
                              
                              // Debug logging
                              if (msgStoragePath && !msgMediaUrl) {
                                console.warn("Message has storage_path but no media_url:", {
                                  messageId: message.id,
                                  storage_path: msgStoragePath,
                                  media_type: msgMediaType,
                                  fullMessage: message
                                });
                              }
                              
                              return msgMediaUrl ? (
                                <div className="mb-2">
                                  {msgMediaType === 'image' ? (
                                  <img
                                    src={message.media_url || (message as any).media_url}
                                    alt="Shared image"
                                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(message.media_url || (message as any).media_url, '_blank')}
                                  />
                                ) : (
                                  <VideoPlayer 
                                    src={message.media_url || (message as any).media_url}
                                    messageId={message.id}
                                  />
                                )}
                                </div>
                              ) : null;
                            })()}
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
