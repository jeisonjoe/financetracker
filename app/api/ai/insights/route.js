import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json().catch(() => ({}));
    const headerKey = req.headers.get("x-ai-key") || "";
    const period = body.period || "this_month";

    const [analytics, planning, txList] = await Promise.all([
      services.analyticsService.getDashboardOverview(user.id, period),
      services.planningService.getOverview(user.id),
      services.transactionService.list(user.id, { page: 0, pageSize: 80 }),
    ]);

    const result = await services.aiService.generateSpendInsights({
      analytics,
      planning,
      transactions: txList.items || [],
      currency: user.currency || "INR",
      provider: body.provider,
      apiKey: body.apiKey || headerKey,
      model: body.model,
    });

    return NextResponse.json(result);
  });
}

