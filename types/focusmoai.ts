export interface FocusMoaiEntry {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  max_members: number;
  price_monthly: number;
  created_at: string;
  workout_focus: { name: string } | null;
  member_count: number;
  /** Share slug for /focus/<slug> links; also the typeable invite code. */
  join_slug: string | null;
}

export interface FocusMoaiMember {
  id: string;
  user_id: string;
  joined_at: string;
  status: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    email: string;
    profile_picture_url: string | null;
  } | null;
}
