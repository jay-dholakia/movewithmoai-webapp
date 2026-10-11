"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CoachService } from "@/lib/services/coachService";
import type { CoachProfile, MoaiMemberMetrics } from "@/lib/types/coach";
import type { MoaiChatMessage, MoaiChat } from "@/lib/services/chatService";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  X,
  BarChart3,
} from "lucide-react";

interface TrendAnalysis {
  completionRateTrend: "up" | "down" | "stable";
  completionRateChange: number;
  memberEngagementTrend: "up" | "down" | "stable";
  memberEngagementChange: number;
  recentWeeks: Array<{
    week_start: string;
    completion_rate: number;
    member_count: number;
  }>;
}

interface FocusMoaiDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  max_members: number;
  price_monthly: number | null;
  workout_focus_id: string | null;
  workout_focus_name: string | null;
  is_public: boolean;
  is_published: boolean;
  created_at: string;
  member_count: number;
  weeks_active: number;
  members: MoaiMemberMetrics[];
  moai_commitment_history: Array<{
    week_start: string;
    total_commitment: number;
    total_completed: number;
    member_count: number;
    completion_rate: number;
  }>;
  moai_workout_stats: {
    total_workouts: number;
    completed_workouts: number;
  };
}

export default function FocusMoaiAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const moaiId = params.moaiId as string;

  const [moaiDetail, setMoaiDetail] = useState<FocusMoaiDetail | null>(null);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<MoaiChatMessage[]>([]);
  const [moaiChat, setMoaiChat] = useState<MoaiChat | null>(null);
  const [chatInputText, setChatInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [focuses, setFocuses] = useState<{ id: string; name: string }[]>([]);
  const [updatingFocus, setUpdatingFocus] = useState<Record<string, boolean>>(
    {},
  );
  const [memberFocuses, setMemberFocuses] = useState<Record<string, string>>(
    {},
  );

  const handleFocusChange = async (userId: string, focusId: string) => {
    setUpdatingFocus((prev) => ({ ...prev, [userId]: true }));
    const { error } = await supabase
      .from("users")
      .update({ focus: focusId })
      .eq("id", userId);
    if (!error) setMemberFocuses((prev) => ({ ...prev, [userId]: focusId }));
    setUpdatingFocus((prev) => ({ ...prev, [userId]: false }));
  };

  useEffect(() => {
    loadMoaiDetail();
  }, [moaiId]);

  const loadMoaiDetail = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        router.push("/coach/login");
        return;
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(
        session.user.id,
      );

      if (!profile) {
        console.error("No coach profile found for user:", session.user.id);
        router.push("/");
        return;
      }

      setCoachProfile(profile);

      // Get Focus Moai detail
      const detail = await CoachService.getFocusMoaiDetail(moaiId);
      if (!detail) {
        console.error("Focus Moai detail not found or access denied");
        router.push("/coach/moais");
        return;
      }

      setMoaiDetail(detail);

      const { data: focusData } = await supabase
        .from("workout_focus")
        .select("id, name")
        .order("name");
      setFocuses(focusData || []);

      if (detail.members?.length > 0) {
        const memberIds = detail.members.map((m: any) => m.user_id);
        const { data: usersData } = await supabase
          .from("users")
          .select("id, focus")
          .in("id", memberIds);

        const focusMap: Record<string, string> = {};
        if (usersData) {
          usersData.forEach((u: any) => {
            if (u.focus && focusData) {
              const matchById = focusData.find((f: any) => f.id === u.focus);
              const matchByName = focusData.find(
                (f: any) => f.name === u.focus,
              );
              const match = matchById || matchByName;
              if (match) focusMap[u.id] = match.id;
            }
          });
        }
        setMemberFocuses(focusMap);
      }
    } catch (error) {
      console.error("Error loading Focus Moai detail:", error);
      setMoaiDetail(null);
    } finally {
      setLoading(false);
    }
  };

  // Load chat when chat panel is opened
  useEffect(() => {
    if (!showChat || !moaiDetail || !coachProfile?.user_id) return;

    let unsubscribe: (() => void) | null = null;

    const loadChat = async () => {
      try {
        const { data: chat } = await supabase
          .from("focus_moai_chats")
          .select("*")
          .eq("focus_moai_id", moaiId)
          .single();

        if (!chat) {
          console.error("Focus Moai chat not found");
          return;
        }

        setMoaiChat(chat);

        // Get messages
        const { data: messages } = await supabase
          .from("focus_moai_chat_messages")
          .select(
            "id, chat_id, sender_id, message, created_at, is_deleted, is_edited, edited_at, reply_parent_message_id, sender:users!focus_moai_chat_messages_sender_id_fkey(id, first_name, last_name, username, profile_picture_url)",
          )
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: true });

        const formattedMessages: MoaiChatMessage[] = (messages || []).map(
          (msg: any) => ({
            id: msg.id,
            moai_chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            message: msg.message,
            timestamp: msg.created_at,
            is_coach: msg.sender_id === coachProfile?.user_id,
            sender_name: msg.sender
              ? `${msg.sender.first_name || ""} ${msg.sender.last_name || ""}`.trim() ||
                msg.sender.username ||
                "User"
              : "User",
            sender_profile_picture_url: msg.sender?.profile_picture_url || null,
            is_deleted: msg.is_deleted ?? false,
            is_edited: msg.is_edited ?? false,
            edited_at: msg.edited_at ?? null,
            reply_parent_message_id: msg.reply_parent_message_id ?? null,
          }),
        );

        setChatMessages(formattedMessages);

        // Subscribe to new messages
        const channel = supabase
          .channel(`focus-moai-chat-${chat.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "focus_moai_chat_messages",
              filter: `chat_id=eq.${chat.id}`,
            },
            async (payload: any) => {
              const newMsg = payload.new;
              const { data: sender } = await supabase
                .from("users")
                .select(
                  "id, first_name, last_name, username, profile_picture_url",
                )
                .eq("id", newMsg.sender_id)
                .single();

              const formatted: MoaiChatMessage = {
                id: newMsg.id,
                moai_chat_id: newMsg.chat_id,
                sender_id: newMsg.sender_id,
                message: newMsg.message,
                timestamp: newMsg.created_at,
                is_coach: newMsg.sender_id === coachProfile?.user_id,
                sender_name: sender
                  ? `${sender.first_name || ""} ${sender.last_name || ""}`.trim() ||
                    sender.username ||
                    "User"
                  : "User",
                sender_profile_picture_url: sender?.profile_picture_url || null,
                is_deleted: false,
                is_edited: false,
                edited_at: null,
                reply_parent_message_id: null,
              };

              setChatMessages((prev) => {
                if (prev.some((m) => m.id === formatted.id)) return prev;
                return [...prev, formatted];
              });
            },
          )
          .subscribe();

        unsubscribe = () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error("Error loading chat:", error);
      }
    };

    loadChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [showChat, moaiId, moaiDetail, coachProfile?.user_id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (showChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  const handleSendMessage = async () => {
    if (
      !chatInputText.trim() ||
      !moaiChat ||
      !coachProfile?.user_id ||
      sendingMessage
    )
      return;

    setSendingMessage(true);
    try {
      const { data: newMsg, error } = await supabase
        .from("focus_moai_chat_messages")
        .insert({
          chat_id: moaiChat.id,
          sender_id: coachProfile.user_id,
          message: chatInputText.trim(),
        })
        .select()
        .single();

      if (!error && newMsg) {
        const formatted: MoaiChatMessage = {
          id: newMsg.id,
          moai_chat_id: newMsg.chat_id,
          sender_id: newMsg.sender_id,
          message: newMsg.message,
          timestamp: newMsg.created_at,
          is_coach: true,
          sender_name: coachProfile
            ? `${(coachProfile as any).first_name || ""} ${(coachProfile as any).last_name || ""}`.trim() ||
              "Coach"
            : "Coach",
          sender_profile_picture_url: null,
          is_deleted: false,
          is_edited: false,
          edited_at: null,
          reply_parent_message_id: null,
        };
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === formatted.id)) return prev;
          return [...prev, formatted];
        });
        setChatInputText("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Calculate week-over-week trends
  const trendAnalysis = useMemo((): TrendAnalysis | null => {
    if (!moaiDetail || moaiDetail.moai_commitment_history.length < 2)
      return null;

    const history = [...moaiDetail.moai_commitment_history]
      .sort(
        (a, b) =>
          new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
      )
      .slice(-8);

    if (history.length < 2) return null;

    const recent = history.slice(-4);
    const previous = history.slice(-8, -4);

    const recentAvg =
      recent.reduce((sum, w) => sum + w.completion_rate, 0) / recent.length;
    const previousAvg =
      previous.length > 0
        ? previous.reduce((sum, w) => sum + w.completion_rate, 0) /
          previous.length
        : recentAvg;

    const completionRateChange = recentAvg - previousAvg;
    const completionRateTrend: "up" | "down" | "stable" =
      completionRateChange > 5
        ? "up"
        : completionRateChange < -5
          ? "down"
          : "stable";

    const recentMemberAvg =
      recent.reduce((sum, w) => sum + w.member_count, 0) / recent.length;
    const previousMemberAvg =
      previous.length > 0
        ? previous.reduce((sum, w) => sum + w.member_count, 0) / previous.length
        : recentMemberAvg;

    const memberEngagementChange = recentMemberAvg - previousMemberAvg;
    const memberEngagementTrend: "up" | "down" | "stable" =
      memberEngagementChange > 0.5
        ? "up"
        : memberEngagementChange < -0.5
          ? "down"
          : "stable";

    return {
      completionRateTrend,
      completionRateChange: Math.abs(completionRateChange),
      memberEngagementTrend,
      memberEngagementChange: Math.abs(memberEngagementChange),
      recentWeeks: recent.map((w) => ({
        week_start: w.week_start,
        completion_rate: w.completion_rate,
        member_count: w.member_count,
      })),
    };
  }, [moaiDetail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Focus Moai details...</p>
        </div>
      </div>
    );
  }

  if (!moaiDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Focus Moai not found or you don&apos;t have access
        </p>
        <Link
          href="/coach/moais"
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Moais
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/coach/moais"
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {moaiDetail.name}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {moaiDetail.member_count} members • {moaiDetail.status} •{" "}
                  {moaiDetail.weeks_active} weeks active
                  {moaiDetail.workout_focus_name &&
                    ` • ${moaiDetail.workout_focus_name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <MessageSquare className="h-5 w-5" />
                Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`max-w-7xl mx-auto px-6 py-6 transition-all duration-300 ${
          showChat ? "md:mr-96" : ""
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Commitment %
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {(() => {
                        const totalCommitment =
                          moaiDetail.moai_commitment_history?.reduce(
                            (sum, week) => sum + (week.total_commitment || 0),
                            0,
                          ) || 0;
                        const totalCompleted =
                          moaiDetail.moai_commitment_history?.reduce(
                            (sum, week) => sum + (week.total_completed || 0),
                            0,
                          ) || 0;
                        const commitmentPercent =
                          totalCommitment > 0
                            ? (totalCompleted / totalCommitment) * 100
                            : 0;
                        return commitmentPercent.toFixed(1);
                      })()}
                      %
                    </p>
                    {trendAnalysis && (
                      <div className="flex items-center gap-1 mt-2">
                        {trendAnalysis.completionRateTrend === "up" ? (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              +{trendAnalysis.completionRateChange.toFixed(1)}%
                              vs previous period
                            </span>
                          </>
                        ) : trendAnalysis.completionRateTrend === "down" ? (
                          <>
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-600">
                              -{trendAnalysis.completionRateChange.toFixed(1)}%
                              vs previous period
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Stable</span>
                        )}
                      </div>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Workouts
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.moai_workout_stats?.total_workouts || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {moaiDetail.moai_workout_stats?.completed_workouts || 0}{" "}
                      completed
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Members
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {moaiDetail.member_count}
                    </p>
                    {trendAnalysis && (
                      <div className="flex items-center gap-1 mt-2">
                        {trendAnalysis.memberEngagementTrend === "up" ? (
                          <span className="text-sm text-green-600">
                            +{trendAnalysis.memberEngagementChange.toFixed(1)}{" "}
                            avg members
                          </span>
                        ) : trendAnalysis.memberEngagementTrend === "down" ? (
                          <span className="text-sm text-red-600">
                            -{trendAnalysis.memberEngagementChange.toFixed(1)}{" "}
                            avg members
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Stable</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Member Performance Overview */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Member Performance
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moaiDetail.members?.map((member) => {
                    const memberName =
                      member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.first_name || member.username || "Member";

                    const isStruggling =
                      member.current_week_completion_rate < 50;
                    const isHighPerformer =
                      member.overall_completion_rate >= 85;
                    const isInconsistent =
                      member.current_week_completion_rate > 80 &&
                      member.overall_completion_rate < 70;

                    return (
                      <Link
                        key={member.user_id}
                        href={`/coach/users/${member.user_id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                              {member.profile_picture_url ? (
                                <img
                                  src={member.profile_picture_url}
                                  alt={memberName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-600 font-medium">
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
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {memberName}
                                </p>
                                {isStruggling && (
                                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                )}
                                {isHighPerformer && (
                                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                )}
                                {isInconsistent && (
                                  <Activity className="h-4 w-4 text-yellow-600 shrink-0" />
                                )}
                              </div>
                              {member.username && (
                                <p className="text-xs text-gray-500">
                                  @{member.username}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">This Week</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.current_week_completed}/
                              {member.current_week_commitment}
                            </p>
                            <p
                              className={`text-xs ${
                                member.current_week_completion_rate >= 80
                                  ? "text-green-600"
                                  : member.current_week_completion_rate >= 60
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {member.current_week_completion_rate.toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Overall</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.overall_completion_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.total_workouts} workouts
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Member Focus */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Member Focus
                  </h2>
                  <p className="text-sm text-gray-500">
                    Assign a fitness focus to each member
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {moaiDetail.members?.map((member) => {
                    const memberName =
                      member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.first_name || member.username || "Member";
                    const currentFocus = memberFocuses[member.user_id] || "";
                    const isUpdating = updatingFocus[member.user_id];

                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
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
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {memberName}
                          </p>
                          {member.username && (
                            <p className="text-xs text-gray-500">
                              @{member.username}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isUpdating && (
                            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          )}
                          <select
                            value={currentFocus}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleFocusChange(member.user_id, e.target.value)
                            }
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed min-w-40"
                          >
                            <option value="">No Focus</option>
                            {focuses.map((focus) => (
                              <option key={focus.id} value={focus.id}>
                                {focus.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Week-over-Week Performance Trend */}
            {trendAnalysis && trendAnalysis.recentWeeks.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Performance Trend
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Last 4 weeks</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {trendAnalysis.recentWeeks.map((week, idx) => {
                      const prevWeek = trendAnalysis.recentWeeks[idx - 1];
                      const change = prevWeek
                        ? week.completion_rate - prevWeek.completion_rate
                        : 0;
                      return (
                        <div
                          key={week.week_start}
                          className="flex items-center gap-4"
                        >
                          <div className="w-24 text-sm text-gray-600">
                            {formatDate(week.week_start)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {week.completion_rate.toFixed(1)}% completion
                              </span>
                              {prevWeek && (
                                <span
                                  className={`text-xs flex items-center gap-1 ${
                                    change > 0
                                      ? "text-green-600"
                                      : change < 0
                                        ? "text-red-600"
                                        : "text-gray-500"
                                  }`}
                                >
                                  {change > 0 ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                  ) : change < 0 ? (
                                    <ArrowDownRight className="h-3 w-3" />
                                  ) : null}
                                  {change !== 0
                                    ? Math.abs(change).toFixed(1) + "%"
                                    : "No change"}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  week.completion_rate >= 80
                                    ? "bg-green-600"
                                    : week.completion_rate >= 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(week.completion_rate, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 w-16 text-right">
                            {week.member_count} members
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Member Engagement Dashboard */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Member Engagement Dashboard
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Engagement Scores */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Engagement Scores
                  </h3>
                  <div className="space-y-2">
                    {moaiDetail.members?.map((member) => {
                      const memberName =
                        member.first_name && member.last_name
                          ? `${member.first_name} ${member.last_name}`
                          : member.first_name || member.username || "Member";

                      const hasCommitment = member.current_week_commitment > 0;
                      const currentWeekScore =
                        member.current_week_completion_rate;
                      const overallScore = member.overall_completion_rate;
                      const consistencyScore =
                        member.total_commitment_weeks > 0
                          ? Math.min(
                              100,
                              (member.total_workouts /
                                (member.total_commitment_weeks * 3)) *
                                100,
                            )
                          : 0;

                      const engagementScore = Math.round(
                        currentWeekScore * 0.4 +
                          overallScore * 0.4 +
                          consistencyScore * 0.2,
                      );

                      const engagementLevel =
                        engagementScore >= 80
                          ? "high"
                          : engagementScore >= 60
                            ? "medium"
                            : "low";

                      return (
                        <Link
                          key={member.user_id}
                          href={`/coach/users/${member.user_id}`}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
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
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {memberName}
                              </p>
                              {member.username && (
                                <p className="text-xs text-gray-500">
                                  @{member.username}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">
                                  Score
                                </span>
                                <span
                                  className={`text-sm font-semibold ${
                                    engagementLevel === "high"
                                      ? "text-green-600"
                                      : engagementLevel === "medium"
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {engagementScore}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    engagementLevel === "high"
                                      ? "bg-green-600"
                                      : engagementLevel === "medium"
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${engagementScore}%` }}
                                />
                              </div>
                            </div>
                            {!hasCommitment && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                No Commitment
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* At-Risk Members */}
                {(() => {
                  const atRiskMembers =
                    moaiDetail.members?.filter((member) => {
                      const noCommitment = member.current_week_commitment === 0;
                      const lowCompletion =
                        member.current_week_completion_rate < 50 &&
                        member.current_week_commitment > 0;
                      const declining =
                        member.overall_completion_rate < 60 &&
                        member.total_commitment_weeks >= 3;
                      return noCommitment || lowCompletion || declining;
                    }) || [];

                  if (atRiskMembers.length === 0) return null;

                  return (
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        At-Risk Members ({atRiskMembers.length})
                      </h3>
                      <div className="space-y-2">
                        {atRiskMembers.map((member) => {
                          const memberName =
                            member.first_name && member.last_name
                              ? `${member.first_name} ${member.last_name}`
                              : member.first_name ||
                                member.username ||
                                "Member";

                          const reasons = [];
                          if (member.current_week_commitment === 0)
                            reasons.push("No commitment set");
                          if (
                            member.current_week_completion_rate < 50 &&
                            member.current_week_commitment > 0
                          ) {
                            reasons.push("Low completion this week");
                          }
                          if (
                            member.overall_completion_rate < 60 &&
                            member.total_commitment_weeks >= 3
                          ) {
                            reasons.push("Declining performance");
                          }

                          return (
                            <Link
                              key={member.user_id}
                              href={`/coach/users/${member.user_id}`}
                              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {member.profile_picture_url ? (
                                    <img
                                      src={member.profile_picture_url}
                                      alt={memberName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-gray-600 font-medium text-xs">
                                      {(
                                        member.first_name?.[0] ||
                                        member.username?.[0] ||
                                        "M"
                                      ).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {memberName}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {reasons.join(", ")}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm text-blue-600 font-medium">
                                View Details
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Weeks Active</p>
                  <p className="text-lg font-bold text-gray-900">
                    {moaiDetail.weeks_active}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Weekly Commitment</p>
                  <p className="text-lg font-bold text-gray-900">
                    {moaiDetail.moai_commitment_history.length > 0
                      ? (
                          moaiDetail.moai_commitment_history.reduce(
                            (sum, w) => sum + w.total_commitment,
                            0,
                          ) / moaiDetail.moai_commitment_history.length
                        ).toFixed(1)
                      : "0"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Best Week</p>
                  <p className="text-lg font-bold text-gray-900">
                    {moaiDetail.moai_commitment_history.length > 0
                      ? Math.max(
                          ...moaiDetail.moai_commitment_history.map(
                            (w) => w.completion_rate,
                          ),
                        ).toFixed(1) + "%"
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Commitment History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Recent Weeks
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {moaiDetail.moai_commitment_history
                    ?.slice(0, 6)
                    .map((week) => (
                      <div
                        key={week.week_start}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">
                            {formatDate(week.week_start)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  week.completion_rate >= 80
                                    ? "bg-green-600"
                                    : week.completion_rate >= 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(week.completion_rate, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-900 w-12 text-right">
                              {week.completion_rate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Slide-in Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          showChat ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Focus Moai Chat
              </h2>
              <p className="text-xs text-gray-500 mt-1">{moaiDetail?.name}</p>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-500 hover:text-gray-700 p-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-100">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="mb-2">No messages yet.</p>
                <p className="text-sm">
                  Start a conversation with your Focus Moai members.
                </p>
              </div>
            ) : (
              chatMessages.map((message, index) => {
                const prevMessage = index > 0 ? chatMessages[index - 1] : null;
                const nextMessage =
                  index < chatMessages.length - 1
                    ? chatMessages[index + 1]
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
                        className={`px-4 py-2 rounded-2xl ${
                          message.is_coach
                            ? "bg-blue-500 text-white rounded-tr-sm"
                            : "bg-white text-gray-900 rounded-tl-sm shadow-sm"
                        }`}
                        style={{
                          borderRadius: message.is_coach
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
                          {message.message}
                        </p>
                      </div>
                      {showTimestamp && (
                        <span className="text-xs mt-1 px-1 text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                className="shrink-0 h-10 w-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
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
      </div>

      {/* Overlay when chat is open */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
