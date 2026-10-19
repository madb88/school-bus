import { proxyPush } from "@/lib/push/bff";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyPush(
    request,
    `/api/v1/push/subscriptions/${encodeURIComponent(id)}`,
    "PUT",
  );
}
