import type { NextRequest } from "next/server";
import { handleServerRequest, type RouteContext } from "@/server/http";

export function GET(request: NextRequest, context: RouteContext) {
  return handleServerRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return handleServerRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return handleServerRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return handleServerRequest(request, context);
}
