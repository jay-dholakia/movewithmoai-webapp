"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Users, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_coach: boolean;
  users: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    profile_picture_url: string | null;
  } | null;
}

interface FocusMoai {
  id: string;
  name: string;
  status: string;
  member_count: number;
  max_members: number;
  workout_focus: { name: string } | null;
}

interface Coach {
  id: string;
  user_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
}

const MESSAGE_SELECT = `id, content, created_at, sender_id, is_coach, users(first_name, last_name, username, profile_picture_url)`;

export default function FocusMoaiChatPage() {
  const params = useParams();
  const router = useRouter();
  const focusMoaiId = params.id as string;

  const [supabase, setSupabase] = useState<any>(null);
  const [moai, setMoai] = useState<FocusMoai | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Init supabase
  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => setSupabase(supabase));
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load moai, chat, coach, and messages
  useEffect(() => {
    if (!supabase || !focusMoaiId) return;

    const load = async () => {
      setLoading(true);

      // Get moai details
      const { data: moaiData, error: moaiError } = await supabase
        .from("focus_moais")
        .select(
          `id, name, status, max_members, workout_focus(name), coaches(id, user_id, name, first_name, last_name)`,
        )
        .eq("id", focusMoaiId)
        .single();

      console.log("moaiData:", JSON.stringify(moaiData, null, 2));
      console.log("moaiError:", moaiError);

      if (!moaiData) {
        setLoading(false);
        return;
      }

      // Get member count
      const { count } = await supabase
        .from("focus_moai_members")
        .select("id", { count: "exact", head: true })
        .eq("focus_moai_id", focusMoaiId)
        .eq("status", "active");

      setMoai({ ...moaiData, member_count: count || 0 });
      setCoach(moaiData.coaches || null);

      // Get chat
      const { data: chatData, error: chatError } = await supabase
        .from("focus_moai_chats")
        .select("id")
        .eq("focus_moai_id", focusMoaiId)
        .maybeSingle();

      console.log("chatData:", JSON.stringify(chatData, null, 2));
      console.log("chatError:", chatError);

      if (!chatData) {
        setLoading(false);
        return;
      }

      setChatId(chatData.id);

      // Load messages
      const { data: msgData, error: msgError } = await supabase
        .from("focus_moai_chat_messages")
        .select(MESSAGE_SELECT)
        .eq("chat_id", chatData.id)
        .order("created_at", { ascending: true })
        .limit(100);

      console.log("msgData count:", msgData?.length);
      console.log("msgError:", msgError);

      setMessages(msgData || []);
      setLoading(false);
    };

    load();
  }, [supabase, focusMoaiId]);

  // Realtime subscription
  useEffect(() => {
    if (!supabase || !chatId) return;

    const channel = supabase
      .channel(`focus_moai_chat_coach_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "focus_moai_chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload: any) => {
          console.log("🔴 Realtime message received:", payload.new.id);

          const { data } = await supabase
            .from("focus_moai_chat_messages")
            .select(MESSAGE_SELECT)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Replace optimistic temp message if it exists, otherwise append
              const hasTempCoach = prev.some(
                (m) => m.id.startsWith("temp-") && m.is_coach && data.is_coach,
              );
              if (hasTempCoach) {
                return prev.map((m) =>
                  m.id.startsWith("temp-") && m.is_coach ? data : m,
                );
              }
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        },
      )
      .subscribe((status: string) => {
        console.log("🔴 Realtime subscription status:", status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, chatId]);

  const handleSend = async () => {
    if (!input.trim() || !chatId || !coach?.user_id || sending) return;

    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      content: text,
      sender_id: coach.user_id,
      created_at: new Date().toISOString(),
      is_coach: true,
      users: {
        first_name: coach.first_name,
        last_name: coach.last_name,
        username: null,
        profile_picture_url: null,
      },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from("focus_moai_chat_messages")
        .insert({
          chat_id: chatId,
          sender_id: coach.user_id,
          content: text,
          is_coach: true,
        })
        .select(MESSAGE_SELECT)
        .single();

      if (error) throw error;

      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSenderName = (msg: Message) => {
    const u = msg.users;
    if (!u) return "Unknown";
    if (u.first_name || u.last_name)
      return `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return u.username || "Unknown";
  };

  const getInitial = (msg: Message) => {
    const u = msg.users;
    if (!u) return "?";
    return (u.first_name?.[0] || u.username?.[0] || "?").toUpperCase();
  };

  // Use is_coach column directly
  const isCoachMessage = (msg: Message) => msg.is_coach === true;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>(
    (acc, msg) => {
      const date = new Date(msg.created_at).toDateString();
      const last = acc[acc.length - 1];
      if (last && last.date === date) {
        last.msgs.push(msg);
      } else {
        acc.push({ date, msgs: [msg] });
      }
      return acc;
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
      </div>
    );
  }

  if (!moai) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500">Focus Moai not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-[#1e3a8a] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-purple-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-slate-800 truncate">
              {moai.name}
            </h1>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                moai.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {moai.status}
            </span>
            {moai.workout_focus?.name && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                {moai.workout_focus.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {moai.member_count} of {moai.max_members} members
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-14 w-14 rounded-full bg-purple-50 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-purple-400" />
            </div>
            <p className="text-slate-600 font-medium">No messages yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Start the conversation with your group
            </p>
          </div>
        ) : (
          groupedMessages.map(({ date, msgs }) => (
            <div key={date}>
              {/* Date divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  {formatDate(msgs[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="space-y-2">
                {msgs.map((msg) => {
                  const isCoach = isCoachMessage(msg);
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-center gap-2 ${isCoach ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar for members */}
                      {!isCoach && (
                        <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-medium text-slate-600 overflow-hidden">
                          {msg.users?.profile_picture_url ? (
                            <img
                              src={msg.users.profile_picture_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitial(msg)
                          )}
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[70%] ${isCoach ? "items-end" : "items-start"}`}
                      >
                        {!isCoach && (
                          <span className="text-xs text-slate-500 mb-1 px-1">
                            {getSenderName(msg)}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isCoach
                              ? "bg-[#1e3a8a] text-white rounded-br-sm"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                          } ${msg.id.startsWith("temp-") ? "opacity-60" : ""}`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-xs text-slate-400 mt-1 px-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Spacer for coach messages */}
                      {isCoach && <div className="w-7 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3">
        {!chatId ? (
          <p className="text-center text-sm text-slate-400 py-2">
            Chat not available for this Focus Moai yet
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message your Focus Moai..."
                rows={1}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-colors"
                style={{ minHeight: "42px", maxHeight: "120px" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="h-10 w-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-0.5"
            >
              {sending ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
