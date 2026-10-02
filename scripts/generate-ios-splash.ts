/**
 * Generate iOS apple-touch-startup-image PNGs (dark bg + website bus logo, no square tile).
 *
 * Usage: npm run generate:splash
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  IOS_SPLASH_BACKGROUND,
  IOS_SPLASH_SPECS,
} from "../src/lib/pwa/ios-splash";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public/icons/splash");
/** Same mark as site header — transparent, no app-icon tile. */
const LOGO_SRC = path.join(ROOT, "public/icons/logo-bus-sm.png");

/** Target CSS height of the bus on splash (matches AppSplash visual weight). Aspect 3:2. */
const LOGO_CSS_HEIGHT = 80;
const LOGO_ASPECT = 144 / 96;

function dprFromMedia(media: string): number {
  const match = media.match(/-webkit-device-pixel-ratio:\s*(\d+)/);
  return match ? Number(match[1]) : 3;
}

/** Make residual near-white fringe fully transparent (logo already mostly alpha). */
async function logoWithoutWhiteTile(
  width: number,
  height: number,
): Promise<Buffer> {
  const resized = await sharp(LOGO_SRC)
    .ensureAlpha()
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const spec of IOS_SPLASH_SPECS) {
    const dpr = dprFromMedia(spec.media);
    const logoH = Math.round(LOGO_CSS_HEIGHT * dpr);
    const logoW = Math.round(logoH * LOGO_ASPECT);
    const logo = await logoWithoutWhiteTile(logoW, logoH);

    const left = Math.round((spec.width - logoW) / 2);
    const top = Math.round((spec.height - logoH) / 2);
    const outPath = path.join(OUT_DIR, spec.file);

    await sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 3,
        background: IOS_SPLASH_BACKGROUND,
      },
    })
      .composite([{ input: logo, left, top }])
      .png()
      .toFile(outPath);

    console.log(
      `wrote ${path.relative(ROOT, outPath)} (${spec.width}×${spec.height}, logo ${logoW}×${logoH} @${dpr}x)`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
