import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchDowozyHtml } from "../src/lib/dowozy/fetch-html";
import { parseSchedule } from "../src/lib/dowozy/parse-schedule";
import {
  DOWOZY_SNAPSHOT_PATH,
  DOWOZY_SOURCE_URL,
} from "../src/lib/dowozy/types";

async function main() {
  const html = await fetchDowozyHtml(DOWOZY_SOURCE_URL);
  const schedule = parseSchedule(html, {
    sourceUrl: DOWOZY_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
  });

  const outPath = path.join(process.cwd(), DOWOZY_SNAPSHOT_PATH);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(schedule, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${DOWOZY_SNAPSHOT_PATH} (${schedule.pickups.length} pickup blocks, ${schedule.dropoffsByDate.length} day dropoffs, ${schedule.dropoffsWeekday.length} weekday dropoffs)`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
