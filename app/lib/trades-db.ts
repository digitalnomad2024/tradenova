import { getSupabase } from "./supabase";

export type DbTrade = {
  id: number;
  user_id: string;
  pair: string;
  side: "BUY" | "SELL";
  amount: number;
  entry: number;
  exit: number | null;
  pnl: number;
  status: "OPEN" | "CLOSED";
  created_at: string;
  closed_at: string | null;
};

export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tradenova_session");
}

export async function loadTrades(userId: string): Promise<DbTrade[]> {
  const { data, error } = await getSupabase()
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load trades:", error);
    return [];
  }
  return (data as DbTrade[]) ?? [];
}

export async function insertTrade(trade: {
  user_id: string;
  pair: string;
  side: "BUY" | "SELL";
  amount: number;
  entry: number;
  pnl: number;
}): Promise<DbTrade | null> {
  const { data, error } = await getSupabase()
    .from("trades")
    .insert({
      ...trade,
      status: "OPEN",
      exit: null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert trade:", error);
    return null;
  }
  return data as DbTrade;
}

export async function closeTradeInDb(
  tradeId: number,
  exit: number,
  pnl: number
): Promise<DbTrade | null> {
  const { data, error } = await getSupabase()
    .from("trades")
    .update({
      status: "CLOSED",
      exit,
      pnl,
      closed_at: new Date().toISOString(),
    })
    .eq("id", tradeId)
    .select()
    .single();

  if (error) {
    console.error("Failed to close trade:", error);
    return null;
  }
  return data as DbTrade;
}