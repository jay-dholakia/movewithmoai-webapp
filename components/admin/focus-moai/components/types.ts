export interface FocusMoai {
  id: string;
  name: string;
  description: string | null;
  workout_focus_id: string | null;
  coach_id: string | null;
  max_members: number;
  price_monthly: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  // joined via select
  workout_focus?: { id: string; name: string } | null;
  coaches?: {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
  } | null;
  member_count?: number;
  revenue?: number;
}

export interface FocusMoaiForm {
  name: string;
  description: string;
  workout_focus_id: string;
  coach_id: string;
  max_members: number;
  price_monthly: number;
}

export const EMPTY_FORM: FocusMoaiForm = {
  name: "",
  description: "",
  workout_focus_id: "",
  coach_id: "",
  max_members: 10,
  price_monthly: 0,
};

export const PAGE_SIZE = 20;
