import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET() {
  return ApiController.handle(async ({ services }) => {
    return NextResponse.json({
      envConfigured: services.aiService.getEnvStatus(),
    });
  });
}

export async function POST(req) {
  return ApiController.handle(async ({ services }) => {
    const body = await req.json().catch(() => ({}));
    const headerKey = req.headers.get("x-ai-key") || "";
    const result = await services.aiService.testConnection({
      provider: body.provider,
      apiKey: body.apiKey || headerKey,
      model: body.model,
    });
    return NextResponse.json(result);
  });
}

