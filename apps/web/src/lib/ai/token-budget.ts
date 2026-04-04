import { redis } from "@/lib/redis";

const PLAN_LIMITS: Record<string, number> = {
  starter: 50,
  pro: 500,
  max: 5000,
};

function getBudgetKey(userId: string): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `token_budget:${userId}:${yearMonth}`;
}

export interface BudgetResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function checkAndIncrementBudget(userId: string, plan: string): Promise<BudgetResult> {
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
  const key = getBudgetKey(userId);

  const current = (await redis.get<number>(key)) ?? 0;
  if (current >= limit) {
    return { allowed: false, used: current, limit };
  }

  const newCount = await redis.incr(key);
  if (newCount === 1) {
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);
    const ttlSeconds = Math.floor((endOfMonth.getTime() - Date.now()) / 1000);
    await redis.expire(key, ttlSeconds);
  }

  return { allowed: true, used: newCount, limit };
}
