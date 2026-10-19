import { proxyPush } from "@/lib/push/bff";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  return proxyPush(request, "/api/v1/push/plan", "PUT");
}
