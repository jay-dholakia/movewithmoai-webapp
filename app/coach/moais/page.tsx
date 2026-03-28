"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CoachService } from "@/lib/services/coachService";
import { ChatService } from "@/lib/services/chatService";
import type { MoaiMetrics, CoachProfile, MoaiDetail } from "@/lib/types/coach";
import type { MoaiChatMessage, MoaiChat } from "@/lib/services/chatService";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Calendar,
  ArrowRight,
  Search,
  X,
  LogOut,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowLeft,
  Target,
} from "lucide-react";
import { FocusMoaiEntry, FocusMoaiMember } from "@/types/focusmoai";

export default function MoaisPage() {
  const [moais, setMoais] = useState<MoaiMetrics[]>([]);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMoaiId, setExpandedMoaiId] = useState<string | null>(null);
  const [moaiDetails, setMoaiDetails] = useState<Record<string, MoaiDetail>>(
    {},
  );
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>(
    {},
  );
  const [todayWorkouts, setTodayWorkouts] = useState<
    Record<string, Set<string>>
  >({});
  const [showChat, setShowChat] = useState(false);
  const [selectedChatMoaiId, setSelectedChatMoaiId] = useState<string | null>(
    null,
  );
  const [chatMessages, setChatMessages] = useState<
    Record<string, MoaiChatMessage[]>
  >({});
  const [moaiChats, setMoaiChats] = useState<Record<string, MoaiChat>>({});
  const [chatInputText, setChatInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [focusMoais, setFocusMoais] = useState<FocusMoaiEntry[]>([]);
  const [focusMoaisLoading, setFocusMoaisLoading] = useState(true);
  const [expandedFocusMoaiId, setExpandedFocusMoaiId] = useState<string | null>(
    null,
  );
  const [focusMoaiMembers, setFocusMoaiMembers] = useState<
    Record<string, FocusMoaiMember[]>
  >({});
  const [loadingFocusMembers, setLoadingFocusMembers] = useState<
    Record<string, boolean>
  >({});
  const [focusMoaiChatData, setFocusMoaiChatData] = useState<
    Record<string, { chatId: string; messages: any[] }>
  >({});
  const [selectedChatType, setSelectedChatType] = useState<
    "moai" | "focus-moai"
  >("moai");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMoais();
  }, []);

  const loadMoais = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/coach/login";
        return;
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(
        session.user.id,
      );
      if (!profile) {
        window.location.href = "/";
        return;
      }

      setCoachProfile(profile);
      loadFocusMoais(profile.id);

      // Get Moais
      const moaisData = await CoachService.getMoais(profile.id);
      setMoais(moaisData);
    } catch (error) {
      console.error("Error loading Moais:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFocusMoais = async (coachId: string) => {
    try {
      setFocusMoaisLoading(true);
      const { data, error } = await supabase
        .from("focus_moais")
        .select(
          `id, name, description, status, max_members, price_monthly, created_at, workout_focus(name)`,
        )
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const withCounts = await Promise.all(
        (data || []).map(async (fm: any) => {
          const { count } = await supabase
            .from("focus_moai_members")
            .select("id", { count: "exact", head: true })
            .eq("focus_moai_id", fm.id)
            .eq("status", "active");
          return { ...fm, member_count: count || 0 };
        }),
      );
      setFocusMoais(withCounts);
    } catch (err) {
      console.error("Error loading focus moais:", err);
    } finally {
      setFocusMoaisLoading(false);
    }
  };

  const filteredMoais = moais.filter((moai) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return moai.moai_name.toLowerCase().includes(query);
  });

  const totalUnread = moais.reduce(
    (sum, moai) => sum + moai.unread_messages_count,
    0,
  );

  // Load chat for a specific Moai
  const loadChat = async (moaiId: string) => {
    if (chatMessages[moaiId] || !coachProfile) return;

    try {
      // Get Moai detail to get subscription start date
      const detail = await CoachService.getMoaiDetail(moaiId, coachProfile.id);
      if (!detail) return;

      // Get chat
      const chat = await ChatService.getMoaiChat(moaiId);
      if (!chat) return;

      setMoaiChats((prev) => ({ ...prev, [moaiId]: chat }));

      // Get messages
      const messages = await ChatService.getMoaiChatMessages(
        chat.id,
        detail.coach_subscription_started_at,
      );
      setChatMessages((prev) => ({ ...prev, [moaiId]: messages }));

      // Subscribe to new messages
      ChatService.subscribeToMoaiChatMessages(
        chat.id,
        detail.coach_subscription_started_at,
        (newMessage) => {
          setChatMessages((prev) => {
            const existing = prev[moaiId] || [];
            if (existing.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return { ...prev, [moaiId]: [...existing, newMessage] };
          });
        },
      );
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const loadFocusMoaiChat = async (focusMoaiId: string) => {
    if (focusMoaiChatData[focusMoaiId]) return;

    const { data: chatData } = await supabase
      .from("focus_moai_chats")
      .select("id")
      .eq("focus_moai_id", focusMoaiId)
      .maybeSingle();

    if (!chatData) return;

    const { data: msgs } = await supabase
      .from("focus_moai_chat_messages")
      .select(
        `id, content, created_at, sender_id, is_coach, users(first_name, last_name, profile_picture_url)`,
      )
      .eq("chat_id", chatData.id)
      .order("created_at", { ascending: true })
      .limit(100);

    setFocusMoaiChatData((prev) => ({
      ...prev,
      [focusMoaiId]: { chatId: chatData.id, messages: msgs || [] },
    }));

    supabase
      .channel(`focus_moai_panel_${chatData.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "focus_moai_chat_messages",
          filter: `chat_id=eq.${chatData.id}`,
        },
        async (payload: any) => {
          const { data } = await supabase
            .from("focus_moai_chat_messages")
            .select(
              `id, content, created_at, sender_id, is_coach, users(first_name, last_name, profile_picture_url)`,
            )
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setFocusMoaiChatData((prev) => {
              const existing = prev[focusMoaiId]?.messages || [];
              if (existing.some((m: any) => m.id === data.id)) return prev;
              return {
                ...prev,
                [focusMoaiId]: {
                  chatId: chatData.id,
                  messages: [...existing, data],
                },
              };
            });
          }
        },
      )
      .subscribe();
  };

  const handleToggleFocusMoai = async (focusMoaiId: string) => {
    if (expandedFocusMoaiId === focusMoaiId) {
      setExpandedFocusMoaiId(null);
      return;
    }
    setExpandedFocusMoaiId(focusMoaiId);

    if (!focusMoaiMembers[focusMoaiId] && !loadingFocusMembers[focusMoaiId]) {
      setLoadingFocusMembers((prev) => ({ ...prev, [focusMoaiId]: true }));
      try {
        const { data } = await supabase
          .from("focus_moai_members")
          .select(
            `id, user_id, joined_at, status, users(first_name, last_name, username, email, profile_picture_url)`,
          )
          .eq("focus_moai_id", focusMoaiId)
          .eq("status", "active")
          .order("joined_at", { ascending: true });
        const members: FocusMoaiMember[] = (data || []).map((item) => ({
          ...item,
          users: Array.isArray(item.users) ? item.users[0] : item.users,
        }));

        setFocusMoaiMembers((prev) => ({ ...prev, [focusMoaiId]: members }));
      } catch (err) {
        console.error("Error loading focus moai members:", err);
      } finally {
        setLoadingFocusMembers((prev) => ({ ...prev, [focusMoaiId]: false }));
      }
    }
  };

  const handleSelectChat = (
    id: string,
    type: "moai" | "focus-moai" = "moai",
  ) => {
    setSelectedChatMoaiId(id);
    setSelectedChatType(type);
    if (type === "focus-moai") {
      loadFocusMoaiChat(id);
    } else {
      loadChat(id);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (
      !chatInputText.trim() ||
      !selectedChatMoaiId ||
      !coachProfile?.user_id ||
      sendingMessage
    )
      return;

    setSendingMessage(true);

    try {
      if (selectedChatType === "focus-moai") {
        const focusChat = focusMoaiChatData[selectedChatMoaiId];
        if (!focusChat) return;

        const { data } = await supabase
          .from("focus_moai_chat_messages")
          .insert({
            chat_id: focusChat.chatId,
            sender_id: coachProfile.user_id,
            content: chatInputText.trim(),
            is_coach: true,
          })
          .select(
            `id, content, created_at, sender_id, is_coach, users(first_name, last_name, profile_picture_url)`,
          )
          .single();

        if (data) {
          setFocusMoaiChatData((prev) => ({
            ...prev,
            [selectedChatMoaiId]: {
              ...focusChat,
              messages: [...focusChat.messages, data],
            },
          }));
          setChatInputText("");
        }
      } else {
        const chat = moaiChats[selectedChatMoaiId];
        if (!chat) return;

        const newMessage = await ChatService.sendMoaiChatMessage(
          chat.id,
          coachProfile.user_id,
          chatInputText.trim(),
        );
        if (newMessage) {
          setChatMessages((prev) => ({
            ...prev,
            [selectedChatMoaiId]: [
              ...(prev[selectedChatMoaiId] || []),
              newMessage,
            ],
          }));
          setChatInputText("");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (selectedChatMoaiId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, selectedChatMoaiId]);

  const handleToggleExpand = async (moaiId: string) => {
    if (expandedMoaiId === moaiId) {
      setExpandedMoaiId(null);
    } else {
      setExpandedMoaiId(moaiId);

      // Load details if not already loaded
      if (!moaiDetails[moaiId] && !loadingDetails[moaiId]) {
        setLoadingDetails((prev) => ({ ...prev, [moaiId]: true }));

        try {
          if (!coachProfile) return;

          const detail = await CoachService.getMoaiDetail(
            moaiId,
            coachProfile.id,
          );
          if (detail) {
            setMoaiDetails((prev) => ({ ...prev, [moaiId]: detail }));

            // Check for today's workouts
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const memberIds = detail.members.map((m) => m.user_id);
            const { data: workouts } = await supabase
              .from("workout_sessions")
              .select("user_id")
              .in("user_id", memberIds)
              .eq("status", "completed")
              .gte("completed_at", today.toISOString())
              .lt("completed_at", tomorrow.toISOString());

            const completedToday = new Set(
              workouts?.map((w) => w.user_id) || [],
            );
            setTodayWorkouts((prev) => ({ ...prev, [moaiId]: completedToday }));
          }
        } catch (error) {
          console.error("Error loading Moai details:", error);
        } finally {
          setLoadingDetails((prev) => ({ ...prev, [moaiId]: false }));
        }
      }
    }
  };

  const currentFocusMessages =
    selectedChatType === "focus-moai" && selectedChatMoaiId
      ? focusMoaiChatData[selectedChatMoaiId]?.messages || []
      : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moais</h1>
              {loading ? (
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-sm text-gray-600 mt-1">
                  {coachProfile?.name} • {moais.length}{" "}
                  {moais.length === 1 ? "Moai" : "Moais"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {totalUnread > 0 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <MessageSquare className="h-5 w-5" />
                  <span className="font-medium">{totalUnread} unread</span>
                </div>
              )}
              <button
                onClick={() => setShowChat(!showChat)}
                className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Chat</span>
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Moais</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moais.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Members
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  Avg Completion Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {moais.length > 0
                    ? (
                        moais.reduce(
                          (sum, m) => sum + m.overall_completion_rate,
                          0,
                        ) / moais.length
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
                <p className="text-sm font-medium text-gray-600">
                  Unread Messages
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalUnread}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Moais List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Moai Groups
              </h2>
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
                  onClick={() => setSearchQuery("")}
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
                  ? "No Moais found"
                  : "No Moais match your search"}
              </div>
            ) : (
              filteredMoais.map((moai) => {
                const isExpanded = expandedMoaiId === moai.moai_id;
                const detail = moaiDetails[moai.moai_id];
                const isLoadingDetail = loadingDetails[moai.moai_id];
                const completedToday = todayWorkouts[moai.moai_id] || new Set();

                return (
                  <div
                    key={moai.moai_id}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {moai.moai_name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                moai.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : moai.status === "forming"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
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
                              <span className="text-gray-500">Members:</span>{" "}
                              <span className="font-medium text-gray-900">
                                {moai.member_count}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                Current Week:
                              </span>{" "}
                              <span className="font-medium text-gray-900">
                                {moai.current_week_completed}/
                                {moai.current_week_commitment} (
                                {moai.current_week_completion_rate.toFixed(0)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                Overall Rate:
                              </span>{" "}
                              <span className="font-medium text-gray-900">
                                {moai.overall_completion_rate.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                Total Workouts:
                              </span>{" "}
                              <span className="font-medium text-gray-900">
                                {moai.total_workouts}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={() => handleToggleExpand(moai.moai_id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                          <Link
                            href={`/coach/moais/${moai.moai_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <span>View Dashboard</span>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Stats Preview */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        {isLoadingDetail ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">
                              Loading stats...
                            </span>
                          </div>
                        ) : detail ? (
                          <div className="space-y-4">
                            {/* Moai-level Progress - Weekly Stats */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                This Week's Progress
                              </h4>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600">
                                      {moai.current_week_completed}/
                                      {moai.current_week_commitment} workouts
                                      completed
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {moai.current_week_completion_rate.toFixed(
                                        1,
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(moai.current_week_completion_rate, 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Member List with Progress */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                Members
                              </h4>
                              <div className="space-y-3">
                                {detail.members.map((member) => {
                                  const memberName =
                                    member.first_name && member.last_name
                                      ? `${member.first_name} ${member.last_name}`
                                      : member.username ||
                                        member.email ||
                                        "Unknown";
                                  const hasCompletedToday = completedToday.has(
                                    member.user_id,
                                  );
                                  const commitmentProgress =
                                    member.current_week_commitment > 0
                                      ? (member.current_week_completed /
                                          member.current_week_commitment) *
                                        100
                                      : 0;

                                  return (
                                    <div
                                      key={member.user_id}
                                      className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {member.profile_picture_url ? (
                                          <img
                                            src={member.profile_picture_url}
                                            alt={memberName}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <span className="text-gray-600 font-medium text-sm">
                                            {(
                                              member.first_name?.[0] ||
                                              member.username?.[0] ||
                                              "M"
                                            ).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900 truncate">
                                            {memberName}
                                          </span>
                                          {hasCompletedToday && (
                                            <CheckCircle2
                                              className="h-4 w-4 text-green-600 flex-shrink-0"
                                              aria-label="Completed workout today"
                                            />
                                          )}
                                        </div>
                                        <div className="mt-1">
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-500">
                                              {member.current_week_completed}/
                                              {member.current_week_commitment}{" "}
                                              workouts
                                            </span>
                                            <span className="text-xs font-medium text-gray-700">
                                              {commitmentProgress.toFixed(0)}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                              className={`h-1.5 rounded-full transition-all ${
                                                commitmentProgress >= 100
                                                  ? "bg-green-600"
                                                  : commitmentProgress >= 70
                                                    ? "bg-blue-600"
                                                    : "bg-orange-500"
                                              }`}
                                              style={{
                                                width: `${Math.min(commitmentProgress, 100)}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Unable to load Moai details
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Focus Moais Section */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Focus Moais
                </h2>
              </div>
              <span className="text-sm text-gray-500">
                {focusMoais.length} total
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {focusMoaisLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                <span className="ml-3 text-gray-500 text-sm">
                  Loading focus moais...
                </span>
              </div>
            ) : focusMoais.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No Focus Moais assigned to you yet
              </div>
            ) : (
              focusMoais.map((fm) => {
                const isExpanded = expandedFocusMoaiId === fm.id;
                const members = focusMoaiMembers[fm.id] || [];
                const isLoadingMembers = loadingFocusMembers[fm.id];
                const capacityPct = Math.min(
                  (fm.member_count / fm.max_members) * 100,
                  100,
                );

                return (
                  <div
                    key={fm.id}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {fm.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${fm.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                            >
                              {fm.status}
                            </span>
                            {fm.workout_focus?.name && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                {fm.workout_focus.name}
                              </span>
                            )}
                          </div>
                          {fm.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate max-w-xl">
                              {fm.description}
                            </p>
                          )}
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Members:</span>{" "}
                              <span className="font-medium text-gray-900">
                                {fm.member_count}/{fm.max_members}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Price:</span>{" "}
                              <span className="font-medium text-gray-900">
                                ${fm.price_monthly.toFixed(2)}/mo
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Revenue:</span>{" "}
                              <span className="font-medium text-gray-900">
                                $
                                {(fm.member_count * fm.price_monthly).toFixed(
                                  2,
                                )}
                                /mo
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-purple-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${capacityPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {capacityPct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => handleToggleFocusMoai(fm.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        {isLoadingMembers ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                            <span className="ml-3 text-gray-500 text-sm">
                              Loading members...
                            </span>
                          </div>
                        ) : members.length === 0 ? (
                          <p className="text-center text-sm text-gray-500 py-4">
                            No active members yet
                          </p>
                        ) : (
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <button
                              onClick={() => {
                                handleSelectChat(fm.id, "focus-moai");
                                setShowChat(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Open Chat
                            </button>
                            <div className="space-y-3">
                              {members.map((member) => {
                                const user = member.users;
                                const displayName =
                                  user?.first_name && user?.last_name
                                    ? `${user.first_name} ${user.last_name}`
                                    : user?.username ||
                                      user?.email ||
                                      "Unknown";
                                const initial = (
                                  user?.first_name?.[0] ||
                                  user?.username?.[0] ||
                                  "M"
                                ).toUpperCase();
                                return (
                                  <div
                                    key={member.id}
                                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {user?.profile_picture_url ? (
                                        <img
                                          src={user.profile_picture_url}
                                          alt={displayName}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-purple-700 font-medium text-sm">
                                          {initial}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {displayName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Joined{" "}
                                        {new Date(
                                          member.joined_at,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </p>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                      {member.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Chat Panel - Messenger Style */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          showChat ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {!selectedChatMoaiId ? (
          /* Chat List View */
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Messages
                </h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {moais.length === 0 ? (
                <div className="text-center text-gray-500 py-8 px-6">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>No Moais found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {moais
                    .sort((a, b) => {
                      // Sort by unread count first, then by last message
                      if (a.unread_messages_count !== b.unread_messages_count) {
                        return (
                          b.unread_messages_count - a.unread_messages_count
                        );
                      }
                      return 0;
                    })
                    .map((moai) => (
                      <button
                        key={moai.moai_id}
                        onClick={() => handleSelectChat(moai.moai_id)}
                        className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {moai.moai_name}
                              </h3>
                              {moai.unread_messages_count > 0 && (
                                <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                                  {moai.unread_messages_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {moai.member_count}{" "}
                              {moai.member_count === 1 ? "member" : "members"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
              {focusMoais
                .filter((fm) => fm.member_count > 0)
                .map((fm) => (
                  <button
                    key={`focus-${fm.id}`}
                    onClick={() => handleSelectChat(fm.id, "focus-moai")}
                    className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <Target className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {fm.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {fm.member_count}{" "}
                          {fm.member_count === 1 ? "member" : "members"} · Focus
                          Moai
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          /* Conversation View */
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChatMoaiId(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    selectedChatType === "focus-moai"
                      ? "bg-purple-100"
                      : "bg-blue-100"
                  }`}
                >
                  {selectedChatType === "focus-moai" ? (
                    <Target className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Users className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {selectedChatType === "focus-moai"
                      ? focusMoais.find((fm) => fm.id === selectedChatMoaiId)
                          ?.name || "Focus Moai Chat"
                      : moais.find((m) => m.moai_id === selectedChatMoaiId)
                          ?.moai_name || "Moai Chat"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedChatType === "focus-moai"
                      ? `${focusMoais.find((fm) => fm.id === selectedChatMoaiId)?.member_count || 0} members · Focus Moai`
                      : `${moais.find((m) => m.moai_id === selectedChatMoaiId)?.member_count || 0} members`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-100">
              {selectedChatType === "focus-moai" ? (
                !focusMoaiChatData[selectedChatMoaiId] ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : currentFocusMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="mb-2">No messages yet.</p>
                    <p className="text-sm">
                      Start the conversation with your Focus Moai.
                    </p>
                  </div>
                ) : (
                  currentFocusMessages.map((message: any, index: number) => {
                    const prevMessage =
                      index > 0 ? currentFocusMessages[index - 1] : null;
                    const nextMessage =
                      index < currentFocusMessages.length - 1
                        ? currentFocusMessages[index + 1]
                        : null;
                    const isCoach = message.is_coach === true;
                    const senderName = message.users
                      ? `${message.users.first_name || ""} ${message.users.last_name || ""}`.trim()
                      : "User";
                    const senderAvatar = message.users?.profile_picture_url;
                    const isSameSender =
                      prevMessage &&
                      prevMessage.sender_id === message.sender_id &&
                      !isCoach;
                    const timeDiff = prevMessage
                      ? new Date(message.created_at).getTime() -
                        new Date(prevMessage.created_at).getTime()
                      : Infinity;
                    const showAvatar =
                      !isCoach && (!isSameSender || timeDiff > 300000);
                    const showTimestamp =
                      !nextMessage ||
                      new Date(nextMessage.created_at).getTime() -
                        new Date(message.created_at).getTime() >
                        300000 ||
                      nextMessage.sender_id !== message.sender_id;

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 mb-1 ${isCoach ? "justify-end" : "justify-start"}`}
                      >
                        {!isCoach && (
                          <div className="w-8 h-8 flex-shrink-0">
                            {showAvatar ? (
                              senderAvatar ? (
                                <img
                                  src={senderAvatar}
                                  alt={senderName}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-purple-200 flex items-center justify-center">
                                  <span className="text-xs font-medium text-purple-700">
                                    {(senderName?.[0] || "U").toUpperCase()}
                                  </span>
                                </div>
                              )
                            ) : (
                              <div className="w-8" />
                            )}
                          </div>
                        )}
                        <div
                          className={`flex flex-col ${isCoach ? "items-end" : "items-start"} max-w-[75%]`}
                        >
                          {!isCoach && !isSameSender && (
                            <span className="text-xs text-gray-600 mb-1 px-1">
                              {senderName}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl ${isCoach ? "bg-blue-500 text-white rounded-tr-sm" : "bg-white text-gray-900 rounded-tl-sm shadow-sm"}`}
                            style={{
                              borderRadius: isCoach
                                ? "18px 18px 4px 18px"
                                : "18px 18px 18px 4px",
                            }}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {message.content}
                            </p>
                          </div>
                          {showTimestamp && (
                            <span className="text-xs mt-1 px-1 text-gray-500">
                              {new Date(message.created_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          )}
                        </div>
                        {isCoach && <div className="w-8 flex-shrink-0" />}
                      </div>
                    );
                  })
                )
              ) : !chatMessages[selectedChatMoaiId] ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chatMessages[selectedChatMoaiId].length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="mb-2">No messages yet.</p>
                  <p className="text-sm">
                    Messages from before you were added to this Moai are not
                    shown.
                  </p>
                </div>
              ) : (
                chatMessages[selectedChatMoaiId].map((message, index) => {
                  const prevMessage =
                    index > 0
                      ? chatMessages[selectedChatMoaiId][index - 1]
                      : null;
                  const nextMessage =
                    index < chatMessages[selectedChatMoaiId].length - 1
                      ? chatMessages[selectedChatMoaiId][index + 1]
                      : null;
                  const isSameSender =
                    prevMessage &&
                    prevMessage.sender_id === message.sender_id &&
                    !message.is_coach;
                  const timeDiff = prevMessage
                    ? new Date(message.timestamp).getTime() -
                      new Date(prevMessage.timestamp).getTime()
                    : Infinity;
                  const showAvatar =
                    !message.is_coach && (!isSameSender || timeDiff > 300000);
                  const showTimestamp =
                    !nextMessage ||
                    new Date(nextMessage.timestamp).getTime() -
                      new Date(message.timestamp).getTime() >
                      300000 ||
                    nextMessage.sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 mb-1 ${message.is_coach ? "justify-end" : "justify-start"}`}
                    >
                      {!message.is_coach && (
                        <div className="w-8 h-8 shrink-0">
                          {showAvatar ? (
                            message.sender_profile_picture_url ? (
                              <img
                                src={message.sender_profile_picture_url}
                                alt={message.sender_name || "User"}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {(
                                    message.sender_name?.[0] || "U"
                                  ).toUpperCase()}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="w-8" />
                          )}
                        </div>
                      )}
                      <div
                        className={`flex flex-col ${message.is_coach ? "items-end" : "items-start"} max-w-[75%]`}
                      >
                        {!message.is_coach && !isSameSender && (
                          <span className="text-xs text-gray-600 mb-1 px-1">
                            {message.sender_name || "User"}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${message.is_coach ? "bg-blue-500 text-white rounded-tr-sm" : "bg-white text-gray-900 rounded-tl-sm shadow-sm"}`}
                          style={{
                            borderRadius: message.is_coach
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                          }}
                        >
                          <p className="text-sm whitespace-pre-wrap wrap-break-words leading-relaxed">
                            {(message as any).message ||
                              (message as any).content}
                          </p>
                        </div>
                        {showTimestamp && (
                          <span className="text-xs mt-1 px-1 text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        )}
                      </div>
                      {message.is_coach && <div className="w-8 shrink-0" />}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 pr-12 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInputText.trim() || sendingMessage}
                  className="shrink-0 h-10 w-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  aria-label="Send message"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay when chat is open on mobile */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
