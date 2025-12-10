import { supabase } from '../supabase'

export interface ChatMessage {
  id: string
  session_id: string
  sender_id: string | null
  sender_type: 'user' | 'coach'
  coach_name: string | null
  message: string
  timestamp: string
  is_read: boolean
  metadata: any
  is_deleted: boolean
  is_edited: boolean
  edited_at: string | null
  reply_parent_message_id: string | null
}

export interface ChatSession {
  id: string
  user_id: string
  coach_id: string
  created_at: string
  last_message_at: string
  is_active: boolean
}

export class ChatService {
  /**
   * Get chat session for a user
   */
  static async getChatSession(userId: string, coachId: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('coach_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching chat session:', error)
      return null
    }

    // Create session if it doesn't exist using security definer function
    // This bypasses RLS policies to allow coaches to create sessions for their clients
    if (!data) {
      const { data: newSessionArray, error: createError } = await supabase
        .rpc('create_coach_chat_session', {
          p_user_id: userId,
          p_coach_id: coachId,
        })

      if (createError) {
        console.error('Error creating chat session:', createError)
        return null
      }

      // RPC returns a set, get the first element
      const newSession = Array.isArray(newSessionArray) ? newSessionArray[0] : newSessionArray
      if (!newSession) {
        console.error('No session returned from create_coach_chat_session')
        return null
      }

      return newSession as ChatSession
    }

    return data
  }

  /**
   * Get messages for a chat session
   */
  static async getMessages(sessionId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('coach_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_deleted', false)
      .order('timestamp', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data || []
  }

  /**
   * Send a message as coach
   */
  static async sendMessage(
    sessionId: string,
    coachId: string,
    message: string,
    replyParentId?: string
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('coach_chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: coachId,
        sender_type: 'coach',
        message: message,
        reply_parent_message_id: replyParentId || null,
        is_read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return null
    }

    // Update session last_message_at
    await supabase
      .from('coach_chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionId)

    return data
  }

  /**
   * Mark messages as read
   * Uses RPC function to bypass RLS policies that prevent coaches from updating user messages
   */
  static async markMessagesAsRead(sessionId: string, coachId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_coach_chat_messages_read', {
      p_session_id: sessionId,
      p_coach_id: coachId,
    })

    if (error) {
      console.error('Error marking messages as read:', error)
      // Don't throw - allow the UI to continue even if marking as read fails
    }
  }

  /**
   * Subscribe to new messages in real-time
   */
  static subscribeToMessages(
    sessionId: string,
    onNewMessage: (message: ChatMessage) => void
  ) {
    const channel = supabase
      .channel(`coach-chat-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onNewMessage(payload.new as ChatMessage)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}

