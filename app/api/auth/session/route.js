import { NextResponse } from "next/server";
import { ApiController } from "@/app/server/http/ApiController";

export async function GET() {
  return ApiController.handle(
    async ({ services }) => {
      const user = await services.authService.getCurrentUser();
      return NextResponse.json({
        user: user ? user.toJSON() : null,
        provider: services.provider,
      });
    },
    { requireAuth: false }
  );
}

export async function PATCH(req) {
  return ApiController.handle(async ({ services, user }) => {
    const body = await req.json();
    const updated = await services.authService.updateProfile(user.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      currency: body.currency,
    });
    return NextResponse.json({ user: updated.toJSON() });
  });
}

