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

export interface MoaiChatMessage {
  id: string
  moai_chat_id: string
  sender_id: string
  message: string
  timestamp: string
  is_deleted: boolean
  is_edited: boolean
  edited_at: string | null
  reply_parent_message_id: string | null
  is_coach: boolean
  sender_name?: string
  sender_username?: string
  sender_profile_picture_url?: string | null
}

export interface MoaiChat {
  id: string
  circle_id: string
  created_at: string
  last_message_at: string | null
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
    console.log('Setting up real-time subscription for chat session:', sessionId)
    
    const channel = supabase
      .channel(`coach-chat-${sessionId}-${Date.now()}`) // Add timestamp to make channel unique
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Real-time message received in coach chat:', payload)
          onNewMessage(payload.new as ChatMessage)
        }
      )
      .subscribe((status) => {
        console.log('Coach chat subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to coach chat messages')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to coach chat messages')
        }
      })

    return () => {
      console.log('Unsubscribing from coach chat messages')
      supabase.removeChannel(channel)
    }
  }

  /**
   * Get Moai chat for a circle
   * Uses RPC function to bypass RLS (coaches can only access chats for Moais they're subscribed to)
   */
  static async getMoaiChat(moaiId: string): Promise<MoaiChat | null> {
    const { data, error } = await supabase.rpc('get_moai_chat_for_coach', {
      p_circle_id: moaiId,
    })

    if (error) {
      console.error('Error fetching Moai chat:', error)
      return null
    }

    // RPC function returns an array, get the first result
    const chatData = Array.isArray(data) && data.length > 0 ? data[0] : null

    if (!chatData) {
      console.error('Moai chat not found for moaiId:', moaiId)
      return null
    }

    return chatData as MoaiChat
  }

  /**
   * Get messages for a Moai chat, filtered from when coach was added
   */
  static async getMoaiChatMessages(
    moaiChatId: string,
    coachSubscriptionStart: string,
    limit = 100
  ): Promise<MoaiChatMessage[]> {
    console.log('Fetching Moai chat messages:', {
      moaiChatId,
      coachSubscriptionStart,
      limit,
    });
    
    // Use RPC function to bypass RLS (coaches can only access messages from when they were added)
    const { data: messages, error } = await supabase.rpc(
      'get_moai_chat_messages_for_coach',
      {
        p_moai_chat_id: moaiChatId,
        p_coach_subscription_start: coachSubscriptionStart,
        p_limit: limit,
      }
    );

    if (error) {
      console.error('Error fetching Moai chat messages:', error)
      return []
    }
    
    console.log('Fetched Moai chat messages:', {
      messageCount: messages?.length || 0,
      messages: messages?.map((m: any) => ({
        id: m.id,
        timestamp: m.timestamp,
        message: m.message?.substring(0, 50),
        is_coach: m.is_coach,
      })),
    });

    if (!messages || messages.length === 0) {
      return []
    }

    // Get sender details for all unique senders
    const senderIds = Array.from(new Set(messages.map((m) => m.sender_id)))
    const { data: senders } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, profile_picture_url')
      .in('id', senderIds)

    const senderMap = new Map(
      senders?.map((s) => [
        s.id,
        {
          name: s.first_name && s.last_name
            ? `${s.first_name} ${s.last_name}`
            : s.first_name || s.username || 'User',
          username: s.username,
          profile_picture_url: s.profile_picture_url,
        },
      ]) || []
    )

    // Get coach names for coach messages (sender_id is user_id, so query by user_id)
    const coachUserIds = messages.filter((m) => m.is_coach).map((m) => m.sender_id)
    const { data: coaches } = await supabase
      .from('coaches')
      .select('user_id, name, first_name, last_name')
      .in('user_id', coachUserIds)

    const coachMap = new Map(
      coaches?.map((c) => [
        c.user_id,
        {
          name: c.name || (c.first_name && c.last_name
            ? `${c.first_name} ${c.last_name}`
            : c.first_name || 'Coach'),
        },
      ]) || []
    )

    // Enrich messages with sender info
    return messages.map((msg) => {
      if (msg.is_coach) {
        const coachInfo = coachMap.get(msg.sender_id)
        return {
          ...msg,
          sender_name: coachInfo?.name,
          // Coaches don't have username or profile_picture_url in this context
          sender_username: undefined,
          sender_profile_picture_url: undefined,
        }
      } else {
        const userInfo = senderMap.get(msg.sender_id)
        return {
          ...msg,
          sender_name: userInfo?.name,
          sender_username: userInfo?.username,
          sender_profile_picture_url: userInfo?.profile_picture_url,
        }
      }
    })
  }

  /**
   * Send a message to a Moai chat as coach
   * Uses RPC function to bypass RLS (coaches can only send to Moais they're subscribed to)
   */
  static async sendMoaiChatMessage(
    moaiChatId: string,
    coachId: string, // This is user_id
    message: string,
    replyParentId?: string
  ): Promise<MoaiChatMessage | null> {
    console.log('Sending Moai chat message:', {
      moaiChatId,
      coachId,
      message: message.substring(0, 50),
      replyParentId,
    });

    const { data, error } = await supabase.rpc(
      'send_moai_chat_message_for_coach',
      {
        p_moai_chat_id: moaiChatId,
        p_coach_user_id: coachId,
        p_message: message,
        p_reply_parent_message_id: replyParentId || null,
      }
    );

    if (error) {
      console.error('Error sending Moai chat message:', error)
      return null
    }

    // RPC function returns an array, get the first result
    const newMessage = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!newMessage) {
      console.error('No message returned from RPC function')
      return null
    }

    // Get coach info for the response
    const { data: coach } = await supabase
      .from('coaches')
      .select('name, first_name, last_name')
      .eq('user_id', coachId)
      .single()

    return {
      ...newMessage,
      sender_name: coach?.name || (coach?.first_name && coach?.last_name
        ? `${coach.first_name} ${coach.last_name}`
        : coach?.first_name || 'Coach'),
    }
  }

  /**
   * Subscribe to new messages in a Moai chat (real-time)
   */
  static subscribeToMoaiChatMessages(
    moaiChatId: string,
    coachSubscriptionStart: string,
    onNewMessage: (message: MoaiChatMessage) => void
  ) {
    console.log('Setting up real-time subscription for Moai chat:', moaiChatId)
    
    const channel = supabase
      .channel(`moai-chat-${moaiChatId}-${Date.now()}`) // Add timestamp to make channel unique
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moai_chat_messages',
          filter: `moai_chat_id=eq.${moaiChatId}`,
        },
        async (payload) => {
          console.log('Real-time message received:', payload)
          console.log('Payload type:', payload.eventType)
          console.log('New message data:', payload.new)
          const newMessage = payload.new as any
          
          if (!newMessage) {
            console.error('No new message in payload')
            return
          }
          
          console.log('Message timestamp:', newMessage.timestamp)
          console.log('Coach subscription start:', coachSubscriptionStart)
          
          // Only include messages from when coach was added
          if (new Date(newMessage.timestamp) >= new Date(coachSubscriptionStart)) {
            console.log('Message is after coach subscription start, processing...')
            
            // Get sender info
            if (newMessage.is_coach) {
              const { data: coach } = await supabase
                .from('coaches')
                .select('name, first_name, last_name')
                .eq('user_id', newMessage.sender_id)
                .single()

              onNewMessage({
                ...newMessage,
                sender_name: coach?.name || (coach?.first_name && coach?.last_name
                  ? `${coach.first_name} ${coach.last_name}`
                  : coach?.first_name || 'Coach'),
              })
            } else {
              const { data: user } = await supabase
                .from('users')
                .select('username, first_name, last_name, profile_picture_url')
                .eq('id', newMessage.sender_id)
                .single()

              onNewMessage({
                ...newMessage,
                sender_name: user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.first_name || user?.username || 'User',
                sender_username: user?.username,
                sender_profile_picture_url: user?.profile_picture_url,
              })
            }
          } else {
            console.log('Message is before coach subscription start, ignoring...')
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to Moai chat messages')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to Moai chat messages')
        }
      })

    return () => {
      console.log('Unsubscribing from Moai chat messages')
      supabase.removeChannel(channel)
    }
  }
}
