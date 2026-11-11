import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function POST(req) {
  return ApiController.handle(
    async ({ services }) => {
      const { email, password } = await req.json();
      const user = await services.authService.login(email, password);
      return NextResponse.json({
        user: user.toJSON(),
        provider: services.provider,
      });
    },
    { requireAuth: false }
  );
}

