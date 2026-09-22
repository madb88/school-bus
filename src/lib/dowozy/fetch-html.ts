import { DOWOZY_SOURCE_URL } from "./types";

const USER_AGENT = "SchoolBusApp/0.1 (+https://github.com/school-bus)";
const TIMEOUT_MS = 20_000;

export async function fetchDowozyHtml(
  url: string = DOWOZY_SOURCE_URL,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch dowozy page: HTTP ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timed out fetching dowozy page after ${TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
