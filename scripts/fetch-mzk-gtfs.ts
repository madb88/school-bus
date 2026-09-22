import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildMzkScheduleFromGtfs } from "../src/lib/mzk/parse-gtfs";
import {
  MZK_ATTRIBUTION,
  MZK_DEVELOPER_PAGE_URL,
  MZK_SNAPSHOT_PATH,
} from "../src/lib/mzk/types";

async function discoverGtfsZipUrl(): Promise<string> {
  const response = await fetch(MZK_DEVELOPER_PAGE_URL, {
    headers: { "user-agent": "school-bus-next/mzk-gtfs-fetch" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${MZK_DEVELOPER_PAGE_URL}: ${response.status}`,
    );
  }
  const html = await response.text();
  const match = html.match(
    /href="(\/storage\/website\/[^"]+\.zip)"[^>]*>[\s\S]*?GTFS/i,
  );
  if (!match) {
    throw new Error("Could not find GTFS zip link on MZK developer page");
  }
  return new URL(match[1], "https://www.mzk.zgora.pl").href;
}

async function main() {
  const zipUrl = await discoverGtfsZipUrl();
  console.log(`Downloading ${zipUrl}`);

  const zipResponse = await fetch(zipUrl, {
    headers: { "user-agent": "school-bus-next/mzk-gtfs-fetch" },
  });
  if (!zipResponse.ok) {
    throw new Error(`Failed to download GTFS: ${zipResponse.status}`);
  }
  const zipBuffer = Buffer.from(await zipResponse.arrayBuffer());

  const workDir = await mkdtemp(path.join(tmpdir(), "mzk-gtfs-"));
  try {
    const zipPath = path.join(workDir, "gtfs.zip");
    await writeFile(zipPath, zipBuffer);
    execFileSync("unzip", ["-o", "-q", zipPath, "-d", workDir], {
      stdio: "inherit",
    });

    const readGtfs = (name: string) =>
      readFile(path.join(workDir, name), "utf8");

    const schedule = buildMzkScheduleFromGtfs(
      {
        stops: await readGtfs("stops.txt"),
        trips: await readGtfs("trips.txt"),
        routes: await readGtfs("routes.txt"),
        stopTimes: await readGtfs("stop_times.txt"),
        feedInfo: await readGtfs("feed_info.txt"),
        calendarDates: await readGtfs("calendar_dates.txt"),
      },
      {
        sourceUrl: MZK_DEVELOPER_PAGE_URL,
        attribution: MZK_ATTRIBUTION,
        fetchedAt: new Date().toISOString(),
      },
    );

    const outPath = path.join(process.cwd(), MZK_SNAPSHOT_PATH);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(schedule, null, 2)}\n`, "utf8");

    const departureCount = schedule.trips.reduce(
      (sum, trip) => sum + trip.stops.length,
      0,
    );
    console.log(
      `Wrote ${MZK_SNAPSHOT_PATH} (${schedule.stops.length} stops, ${schedule.trips.length} trips, ${departureCount} stop-times)`,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
