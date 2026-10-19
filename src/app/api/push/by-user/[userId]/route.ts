import { proxyPushGet } from "@/lib/push/bff";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  return proxyPushGet(
    request,
    `/api/v1/push/by-user/${encodeURIComponent(userId)}`,
  );
}
