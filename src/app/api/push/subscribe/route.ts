import { proxyPush } from "@/lib/push/bff";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return proxyPush(request, "/api/v1/push/subscribe", "POST");
}

export async function DELETE(request: Request) {
  return proxyPush(request, "/api/v1/push/subscribe", "DELETE");
}
