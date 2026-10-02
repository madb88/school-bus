/**
 * Generate iOS apple-touch-startup-image PNGs.
 * Dark background, website bus logo, and the header wordmark under it
 * (autobus light, szkolny.pl blue) — same stack as the in-app loading splash.
 *
 * Usage: npm run generate:splash
 */
import { mkdir, readFile } from "node:fs/promises";
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
/** OFL subset of Bricolage Grotesque Bold (scripts/fonts/OFL.txt). */
const FONT_SRC = path.join(
  ROOT,
  "scripts/fonts/BricolageGrotesque-Bold.ttf",
);

/** Target CSS height of the bus on splash (matches AppSplash visual weight). Aspect 3:2. */
const LOGO_CSS_HEIGHT = 80;
const LOGO_ASPECT = 144 / 96;
/** Gap between the bus and the wordmark — AppSplash column gap. */
const WORDMARK_GAP_CSS = 12;
/** Slightly larger than the in-app title so the name reads on a full-screen launch image. */
const WORDMARK_FONT_CSS = 22;
const WORDMARK_TRACKING_EM = -0.025;
const WORDMARK_LIGHT = "#f2f6fb";
const WORDMARK_BLUE = "#8eaaef";

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

async function wordmarkPng(
  dpr: number,
  fontBase64: string,
): Promise<{ data: Buffer; width: number; height: number }> {
  const fontPx = WORDMARK_FONT_CSS * dpr;
  const tracking = (WORDMARK_TRACKING_EM * fontPx).toFixed(2);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${Math.ceil(fontPx * 16)}" height="${Math.ceil(fontPx * 2.4)}" xmlns="http://www.w3.org/2000/svg">
  <defs><style><![CDATA[
    @font-face {
      font-family: "Bricolage Grotesque";
      src: url("data:font/ttf;base64,${fontBase64}") format("truetype");
      font-weight: 700;
    }
  ]]></style></defs>
  <text x="50%" y="68%" text-anchor="middle" font-family="Bricolage Grotesque" font-size="${fontPx}" font-weight="700" letter-spacing="${tracking}">
    <tspan fill="${WORDMARK_LIGHT}">autobus</tspan><tspan fill="${WORDMARK_BLUE}">szkolny.pl</tspan>
  </text>
</svg>`;

  const trimmed = await sharp(Buffer.from(svg))
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer({ resolveWithObject: true });

  return {
    data: trimmed.data,
    width: trimmed.info.width,
    height: trimmed.info.height,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const fontBase64 = (await readFile(FONT_SRC)).toString("base64");

  for (const spec of IOS_SPLASH_SPECS) {
    const dpr = dprFromMedia(spec.media);
    const logoH = Math.round(LOGO_CSS_HEIGHT * dpr);
    const logoW = Math.round(logoH * LOGO_ASPECT);
    const logo = await logoWithoutWhiteTile(logoW, logoH);
    const wordmark = await wordmarkPng(dpr, fontBase64);
    const gap = Math.round(WORDMARK_GAP_CSS * dpr);

    const blockH = logoH + gap + wordmark.height;
    const top = Math.round((spec.height - blockH) / 2);
    const logoLeft = Math.round((spec.width - logoW) / 2);
    const wordLeft = Math.round((spec.width - wordmark.width) / 2);
    const outPath = path.join(OUT_DIR, spec.file);

    await sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 3,
        background: IOS_SPLASH_BACKGROUND,
      },
    })
      .composite([
        { input: logo, left: logoLeft, top },
        { input: wordmark.data, left: wordLeft, top: top + logoH + gap },
      ])
      .png()
      .toFile(outPath);

    console.log(
      `wrote ${path.relative(ROOT, outPath)} (${spec.width}×${spec.height}, logo ${logoW}×${logoH}, word ${wordmark.width}×${wordmark.height} @${dpr}x)`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
