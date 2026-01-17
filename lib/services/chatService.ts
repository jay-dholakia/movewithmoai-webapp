import { supabase } from "../supabase";

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string | null;
  sender_type: "user" | "coach";
  coach_name: string | null;
  message: string;
  timestamp: string;
  is_read: boolean;
  metadata: any;
  is_deleted: boolean;
  is_edited: boolean;
  edited_at: string | null;
  reply_parent_message_id: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  coach_id: string;
  created_at: string;
  last_message_at: string;
  is_active: boolean;
}

export interface MoaiChatMessage {
  id: string;
  moai_chat_id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  is_deleted: boolean;
  is_edited: boolean;
  edited_at: string | null;
  reply_parent_message_id: string | null;
  is_coach: boolean;
  sender_name?: string;
  sender_username?: string;
  sender_profile_picture_url?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
}

export interface MoaiChat {
  id: string;
  circle_id: string;
  created_at: string;
  last_message_at: string | null;
}

export class ChatService {
  /**
   * Helper function to convert storage path to full URL
   */
  private static getMediaUrl(storagePath: string | null): string | null {
    if (!storagePath) return null;
    // If it's already a full URL, return it
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }
    // Otherwise, construct the full URL from the storage path
    // The path should be: moai/chatId/filename or client/sessionId/filename
    const { data: urlData } = supabase.storage
      .from('coach-chat-media')
      .getPublicUrl(storagePath);
    
    const fullUrl = urlData.publicUrl;
    console.log("getMediaUrl conversion:", {
      input: storagePath,
      output: fullUrl,
      pathIncludesMoai: storagePath.includes('moai/'),
      pathIncludesClient: storagePath.includes('client/')
    });
    
    return fullUrl;
  }

  /**
   * Upload media file (image or video) to Supabase Storage
   * Note: The 'coach-chat-media' bucket must exist in Supabase Storage
   */
  static async uploadChatMedia(
    file: File,
    sessionIdOrChatId: string,
    chatType: 'client' | 'moai'
  ): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileName = `${chatType}/${sessionIdOrChatId}/${timestamp}-${randomId}.${fileExt}`;
      const filePath = fileName;

      // Determine if it's an image or video
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        throw new Error('File must be an image or video');
      }

      // Validate file size (max 10MB for images, 50MB for videos)
      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(
          `File size must be less than ${isImage ? '10MB' : '50MB'}`
        );
      }

      // Upload file to Supabase Storage - using coach-chat-media bucket
      // Ensure correct content type is set - this is critical for video playback
      // IMPORTANT: Always prioritize file extension over file.type to avoid JSON mime type issues
      let contentType = file.type;
      
      // For videos, always check file extension first (file.type can be wrong/empty)
      if (isVideo) {
        if (fileExt === 'webm') {
          contentType = 'video/webm';
        } else if (fileExt === 'mp4') {
          contentType = 'video/mp4';
        } else if (fileExt === 'mov') {
          contentType = 'video/quicktime';
        } else {
          contentType = file.type || 'video/webm'; // Fallback to file.type or default to webm
        }
      } else if (isImage) {
        // For images, check extension if file.type is missing or generic
        if (!contentType || contentType === 'image/*') {
          contentType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 
                       fileExt === 'png' ? 'image/png' : 
                       fileExt === 'gif' ? 'image/gif' : 
                       fileExt === 'webp' ? 'image/webp' : 
                       (contentType || 'image/*');
        }
      }
      
      // Final safety check - reject generic or incorrect types
      if (contentType === 'application/json' || contentType === 'application/octet-stream') {
        // Force correct type based on extension for known video/image formats
        if (isVideo) {
          contentType = fileExt === 'webm' ? 'video/webm' : fileExt === 'mp4' ? 'video/mp4' : 'video/webm';
        } else if (isImage) {
          contentType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 
                       fileExt === 'png' ? 'image/png' : 
                       fileExt === 'gif' ? 'image/gif' : 'image/jpeg';
        }
      }
      
      console.log("Uploading file with content type:", {
        fileName: file.name,
        fileType: file.type,
        fileExt,
        determinedContentType: contentType,
        fileSize: file.size
      });
      
      // Convert File to ArrayBuffer to avoid multipart/form-data wrapping
      // Supabase's .upload() with File objects may wrap them in multipart
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: contentType });
      
      console.log("Uploading as Blob with content type:", {
        fileName: file.name,
        blobType: blob.type,
        blobSize: blob.size,
        contentType
      });
      
      // Upload as Blob instead of File to avoid multipart wrapping
      const { data, error } = await supabase.storage
        .from('coach-chat-media')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType, // Explicitly set content type - critical for video playback
        });

      if (error) {
        console.error("Error uploading media:", error);
        // If bucket doesn't exist, provide helpful error
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket "coach-chat-media" not found. Please create it in Supabase Storage settings.');
        }
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('coach-chat-media')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Exception uploading media:", err);
      throw err; // Re-throw to allow UI to show error message
    }
  }

  /**
   * Get chat session for a user
   */
  static async getChatSession(
    userId: string,
    coachId: string
  ): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from("coach_chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("coach_id", coachId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching chat session:", error);
      return null;
    }

    // Create session if it doesn't exist using security definer function
    // This bypasses RLS policies to allow coaches to create sessions for their clients
    if (!data) {
      const { data: newSessionArray, error: createError } = await supabase.rpc(
        "create_coach_chat_session",
        {
          p_user_id: userId,
          p_coach_id: coachId,
        }
      );

      if (createError) {
        console.error("Error creating chat session:", createError);
        return null;
      }

      // RPC returns a set, get the first element
      const newSession = Array.isArray(newSessionArray)
        ? newSessionArray[0]
        : newSessionArray;
      if (!newSession) {
        console.error("No session returned from create_coach_chat_session");
        return null;
      }

      return newSession as ChatSession;
    }

    return data;
  }

  /**
   * Get messages for a chat session
   */
  static async getMessages(
    sessionId: string,
    limit = 50
  ): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("coach_chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .eq("is_deleted", false)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Send a message as coach
   */
  static async sendMessage(
    sessionId: string,
    coachId: string,
    message: string,
    replyParentId?: string,
    mediaUrl?: string | null,
    mediaType?: 'image' | 'video' | null
  ): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from("coach_chat_messages")
      .insert({
        session_id: sessionId,
        sender_id: coachId,
        sender_type: "coach",
        message: message,
        reply_parent_message_id: replyParentId || null,
        is_read: false,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    // Broadcast to the shared channel
    const channelName = `coach-chat-${sessionId}`;
    console.log("📢 Broadcasting coach message to channel:", channelName);

    // Get or create the channel and send
    const channel = supabase.channel(channelName);

    // Subscribe first (if not already), then send
    await new Promise<void>((resolve) => {
      const existingChannel = supabase
        .getChannels()
        .find((ch) => ch.topic === `realtime:${channelName}`);

      if (existingChannel) {
        // Already subscribed, send directly
        existingChannel
          .send({
            type: "broadcast",
            event: "new_message",
            payload: data,
          })
          .then(() => resolve());
      } else {
        // Subscribe and send
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel
              .send({
                type: "broadcast",
                event: "new_message",
                payload: data,
              })
              .then(() => resolve());
          }
        });
      }
    });

    // Update session last_message_at
    await supabase
      .from("coach_chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId);

    return data;
  }

  /**
   * Mark messages as read
   * Uses RPC function to bypass RLS policies that prevent coaches from updating user messages
   */
  static async markMessagesAsRead(
    sessionId: string,
    coachId: string
  ): Promise<void> {
    const { error } = await supabase.rpc("mark_coach_chat_messages_read", {
      p_session_id: sessionId,
      p_coach_id: coachId,
    });

    if (error) {
      console.error("Error marking messages as read:", error);
      // Don't throw - allow the UI to continue even if marking as read fails
    }
  }

  // new code

  /**
   * Subscribe to new messages in real-time
   */
  static subscribeToMessages(
    sessionId: string,
    onNewMessage: (message: ChatMessage) => void
  ) {
    const channelName = `coach-chat-${sessionId}`;
    console.log(
      "🔌 Setting up real-time subscription for channel:",
      channelName
    );
    
    const channel = supabase
      .channel(channelName)
      // Listen for broadcast messages
      .on("broadcast", { event: "new_message" }, (payload) => {
        console.log("📨 Broadcast message received:", payload);
        if (payload.payload) {
          onNewMessage(payload.payload as ChatMessage);
        }
      })
      // Also listen for postgres_changes as backup
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coach_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("📨 Postgres change received:", payload);
          onNewMessage(payload.new as ChatMessage);
        }
      )
      .subscribe((status) => {
        console.log("🔌 Coach chat subscription status:", status);
      });

    return () => {
      console.log("🔌 Unsubscribing from coach chat");
      supabase.removeChannel(channel);
    };
  }

  /**
   * Get Moai chat for a circle
   * Uses RPC function to bypass RLS (coaches can only access chats for Moais they're subscribed to)
   */
  static async getMoaiChat(moaiId: string): Promise<MoaiChat | null> {
    const { data, error } = await supabase.rpc("get_moai_chat_for_coach", {
      p_circle_id: moaiId,
    });

    if (error) {
      console.error("Error fetching Moai chat:", error);
      return null;
    }

    // RPC function returns an array, get the first result
    const chatData = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!chatData) {
      console.error("Moai chat not found for moaiId:", moaiId);
      return null;
    }

    return chatData as MoaiChat;
  }

  /**
   * Get messages for a Moai chat, filtered from when coach was added
   */
  static async getMoaiChatMessages(
    moaiChatId: string,
    coachSubscriptionStart: string,
    limit = 100
  ): Promise<MoaiChatMessage[]> {
    console.log("Fetching Moai chat messages:", {
      moaiChatId,
      coachSubscriptionStart,
      limit,
    });
    
    // Use RPC function to bypass RLS (coaches can only access messages from when they were added)
    const { data: messages, error } = await supabase.rpc(
      "get_moai_chat_messages_for_coach",
      {
        p_moai_chat_id: moaiChatId,
        p_coach_subscription_start: coachSubscriptionStart,
        p_limit: limit,
      }
    );

    if (error) {
      console.error("Error fetching Moai chat messages:", error);
      return [];
    }
    
    console.log("Fetched Moai chat messages:", {
      messageCount: messages?.length || 0,
      messages: messages?.map((m: any) => ({
        id: m.id,
        timestamp: m.timestamp,
        message: m.message?.substring(0, 50),
        is_coach: m.is_coach,
      })),
    });

    if (!messages || messages.length === 0) {
      return [];
    }

    // Get sender details for all unique senders
    const senderIds = Array.from(
      new Set(messages.map((m: any) => m.sender_id))
    );
    const { data: senders } = await supabase
      .from("users")
      .select("id, username, first_name, last_name, profile_picture_url")
      .in("id", senderIds);

    const senderMap = new Map(
      senders?.map((s) => [
        s.id,
        {
          name:
            s.first_name && s.last_name
            ? `${s.first_name} ${s.last_name}`
              : s.first_name || s.username || "User",
          username: s.username,
          profile_picture_url: s.profile_picture_url,
        },
      ]) || []
    );

    // Get coach names for coach messages (sender_id is user_id, so query by user_id)
    const coachUserIds = messages
      .filter((m: any) => m.is_coach)
      .map((m: any) => m.sender_id);
    const { data: coaches } = await supabase
      .from("coaches")
      .select("user_id, name, first_name, last_name")
      .in("user_id", coachUserIds);

    const coachMap = new Map(
      coaches?.map((c) => [
        c.user_id,
        {
          name:
            c.name ||
            (c.first_name && c.last_name
            ? `${c.first_name} ${c.last_name}`
              : c.first_name || "Coach"),
        },
      ]) || []
    );

    // Enrich messages with sender info
    return messages.map((msg: any) => {
      const baseMessage = {
        ...msg,
        media_url: ChatService.getMediaUrl(msg.media_storage_path),
        media_type: msg.media_type || null,
      };
      
      if (msg.is_coach) {
        const coachInfo = coachMap.get(msg.sender_id);
        return {
          ...baseMessage,
          sender_name: coachInfo?.name,
          // Coaches don't have username or profile_picture_url in this context
          sender_username: undefined,
          sender_profile_picture_url: undefined,
        };
      } else {
        const userInfo = senderMap.get(msg.sender_id);
        return {
          ...baseMessage,
          sender_name: userInfo?.name,
          sender_username: userInfo?.username,
          sender_profile_picture_url: userInfo?.profile_picture_url,
        };
      }
    });
  }

  /**
   * Send a message to a Moai chat as coach
   * Uses RPC function to bypass RLS (coaches can only send to Moais they're subscribed to)
   */
  static async sendMoaiChatMessage(
    moaiChatId: string,
    coachId: string, // This is user_id
    message: string,
    replyParentId?: string,
    mediaUrl?: string | null,
    mediaType?: 'image' | 'video' | null
  ): Promise<MoaiChatMessage | null> {
    console.log("Sending Moai chat message:", {
      moaiChatId,
      coachId,
      message: message.substring(0, 50),
      replyParentId,
      mediaUrl,
      mediaType,
    });

    // Extract the storage path from the full URL if it's a full URL
    // Full URL format: https://...supabase.co/storage/v1/object/public/coach-chat-media/moai/chatId/filename
    // We want to store just: moai/chatId/filename
    let storagePath: string | null = null;
    if (mediaUrl) {
      if (mediaUrl.includes('/storage/v1/object/public/coach-chat-media/')) {
        storagePath = mediaUrl.split('/storage/v1/object/public/coach-chat-media/')[1];
      } else if (mediaUrl.includes('coach-chat-media/')) {
        storagePath = mediaUrl.split('coach-chat-media/')[1];
      } else {
        storagePath = mediaUrl; // Assume it's already a path
      }
    }

    console.log("Preparing to send message:", {
      hasMedia: !!mediaUrl,
      originalMediaUrl: mediaUrl?.substring(0, 150),
      extractedStoragePath: storagePath,
      mediaType,
      willUseNewRPC: !!storagePath
    });

    // Use RPC function with media support if available, otherwise fall back to old method
    let data, error;
    
    // Always try new RPC function if we have media (even if storagePath extraction failed, use original URL)
    if (mediaUrl) {
      const pathToUse = storagePath || mediaUrl; // Use extracted path or fall back to full URL
      
      // Try the new RPC function with media support
      console.log("Calling send_moai_chat_message_for_coach_with_media with:", {
        p_moai_chat_id: moaiChatId,
        p_coach_user_id: coachId,
        p_message: message.substring(0, 50),
        p_media_storage_path: pathToUse,
        p_media_type: mediaType
      });
      
      const result = await supabase.rpc(
        "send_moai_chat_message_for_coach_with_media",
        {
          p_moai_chat_id: moaiChatId,
          p_coach_user_id: coachId,
          p_message: message,
          p_reply_parent_message_id: replyParentId || null,
          p_media_storage_path: pathToUse,
          p_media_type: mediaType || null,
        }
      );
      data = result.data;
      error = result.error;
      
      if (error) {
        console.error("❌ Error calling new RPC function with media:", error);
        // If the new function doesn't exist, fall back to old method
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          console.log("New RPC function not available, using fallback method");
          error = null; // Reset error to try fallback
          data = null; // Reset data to trigger fallback
        }
      } else {
        console.log("✅ Successfully called new RPC function with media, response:", data);
      }
    }
    
    // Fallback to old RPC function + UPDATE if new function doesn't exist or no media
    if (!data || error) {
      console.log("Using fallback: old RPC function + UPDATE");
      const result = await supabase.rpc(
        "send_moai_chat_message_for_coach",
        {
        p_moai_chat_id: moaiChatId,
        p_coach_user_id: coachId,
        p_message: message,
        p_reply_parent_message_id: replyParentId || null,
      }
    );
      data = result.data;
      error = result.error;
      
      if (error) {
        console.error("❌ Error calling old RPC function:", error);
      } else {
        console.log("✅ Successfully called old RPC function, response:", data);
      }
    }

    if (error) {
      console.error("Error sending Moai chat message:", error);
      return null;
    }

    const newMessage = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!newMessage) {
      console.error("No message returned from RPC function");
      return null;
    }

    // If we used the old RPC function and have media, try UPDATE
    const pathToUseForUpdate = storagePath || mediaUrl;
    if (pathToUseForUpdate && (!newMessage.media_storage_path || !newMessage.media_type)) {
      console.log("Updating message with media via UPDATE:", {
        messageId: newMessage.id,
        storagePath: pathToUseForUpdate,
        mediaType
      });

      const { error: updateError } = await supabase
        .from("moai_chat_messages")
        .update({ 
          media_storage_path: pathToUseForUpdate, 
          media_type: mediaType 
        })
        .eq("id", newMessage.id)
        .eq("sender_id", coachId);

      if (updateError) {
        console.error("❌ Error updating message with media:", updateError);
        // Set media info on message object so it displays even if DB update fails
        newMessage.media_storage_path = pathToUseForUpdate;
        newMessage.media_type = mediaType;
      } else {
        // Update from DB response
        newMessage.media_storage_path = pathToUseForUpdate;
        newMessage.media_type = mediaType;
      }
    }

    const { data: coachData } = await supabase
      .from("coaches")
      .select("name, first_name, last_name")
      .eq("user_id", coachId)
      .single();

    // Map media_storage_path to media_url for the frontend
    const mediaUrlForDisplay = newMessage.media_storage_path 
      ? ChatService.getMediaUrl(newMessage.media_storage_path)
      : (mediaUrl || null);

    console.log("Returning message with media:", {
      messageId: newMessage.id,
      media_storage_path: newMessage.media_storage_path,
      media_type: newMessage.media_type,
      media_url: mediaUrlForDisplay,
      media_url_length: mediaUrlForDisplay?.length,
      // Verify the path format
      path_starts_with_moai: newMessage.media_storage_path?.startsWith('moai/'),
      path_starts_with_client: newMessage.media_storage_path?.startsWith('client/')
    });

    return {
      ...newMessage,
      media_url: mediaUrlForDisplay,
      media_type: newMessage.media_type || mediaType || null,
      sender_name:
        coachData?.name ||
        (coachData?.first_name && coachData?.last_name
          ? `${coachData.first_name} ${coachData.last_name}`
          : coachData?.first_name || "Coach"),
    };
  }

  /**
   * Subscribe to new messages in a Moai chat (real-time)
   */
  static subscribeToMoaiChatMessages(
    moaiChatId: string,
    coachSubscriptionStart: string,
    onNewMessage: (message: MoaiChatMessage) => void
  ) {
    console.log("Setting up real-time subscription for Moai chat:", moaiChatId);
    
    const channel = supabase
      .channel(`moai-chat-${moaiChatId}-${Date.now()}`) // Add timestamp to make channel unique
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moai_chat_messages",
          filter: `moai_chat_id=eq.${moaiChatId}`,
        },
        async (payload) => {
          console.log("Real-time message received:", payload);
          console.log("Payload type:", payload.eventType);
          console.log("New message data:", payload.new);
          const newMessage = payload.new as any;
          
          if (!newMessage) {
            console.error("No new message in payload");
            return;
          }
          
          console.log("Message timestamp:", newMessage.timestamp);
          console.log("Coach subscription start:", coachSubscriptionStart);
          
          // Only include messages from when coach was added
          if (
            new Date(newMessage.timestamp) >= new Date(coachSubscriptionStart)
          ) {
            console.log(
              "Message is after coach subscription start, processing..."
            );
            
            // Get sender info
            try {
            if (newMessage.is_coach) {
                const { data: coach, error: coachError } = await supabase
                  .from("coaches")
                  .select("name, first_name, last_name")
                  .eq("user_id", newMessage.sender_id)
                  .single();

                if (coachError) {
                  console.error("Error fetching coach for message:", coachError);
                }

              onNewMessage({
                ...newMessage,
                  media_url: ChatService.getMediaUrl(newMessage.media_storage_path),
                  media_type: newMessage.media_type || null,
                  sender_name:
                    coach?.name ||
                    (coach?.first_name && coach?.last_name
                  ? `${coach.first_name} ${coach.last_name}`
                      : coach?.first_name || "Coach"),
                });
            } else {
                const { data: user, error: userError } = await supabase
                  .from("users")
                  .select("username, first_name, last_name, profile_picture_url")
                  .eq("id", newMessage.sender_id)
                  .single();

                if (userError) {
                  console.error("Error fetching user for message:", userError);
                }

              onNewMessage({
                ...newMessage,
                  media_url: ChatService.getMediaUrl(newMessage.media_storage_path),
                  media_type: newMessage.media_type || null,
                  sender_name:
                    user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                      : user?.first_name || user?.username || "User",
                  sender_username: user?.username || null,
                  sender_profile_picture_url: user?.profile_picture_url || null,
                });
              }
            } catch (error) {
              console.error("Error processing message in subscription:", error);
              // Don't call onNewMessage if there's an error processing
            }
          } else {
            console.log(
              "Message is before coach subscription start, ignoring..."
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to Moai chat messages");
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to Moai chat messages");
        }
      });

    return () => {
      console.log("Unsubscribing from Moai chat messages");
      supabase.removeChannel(channel);
    };
  }
}
