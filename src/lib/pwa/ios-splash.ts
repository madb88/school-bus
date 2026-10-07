/**
 * iOS standalone launch images (`apple-touch-startup-image`).
 * Portrait sizes for common iPhones; media matches Safari's device CSS viewport.
 */

export const IOS_SPLASH_BACKGROUND = "#111821";

export type IosSplashSpec = {
  /** File under /icons/splash/ */
  file: string;
  width: number;
  height: number;
  media: string;
};

function portraitMedia(
  deviceWidth: number,
  deviceHeight: number,
  dpr: number,
): string {
  return `(device-width: ${deviceWidth}px) and (device-height: ${deviceHeight}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`;
}

/** Splash PNG pixel size = CSS viewport × DPR. */
export const IOS_SPLASH_SPECS: readonly IosSplashSpec[] = [
  // iPhone SE (2nd/3rd), 8
  {
    file: "iphone-750x1334.png",
    width: 750,
    height: 1334,
    media: portraitMedia(375, 667, 2),
  },
  // iPhone X / XS / 11 Pro
  {
    file: "iphone-1125x2436.png",
    width: 1125,
    height: 2436,
    media: portraitMedia(375, 812, 3),
  },
  // iPhone XR / 11
  {
    file: "iphone-828x1792.png",
    width: 828,
    height: 1792,
    media: portraitMedia(414, 896, 2),
  },
  // iPhone XS Max / 11 Pro Max
  {
    file: "iphone-1242x2688.png",
    width: 1242,
    height: 2688,
    media: portraitMedia(414, 896, 3),
  },
  // iPhone 12/13/14 mini
  {
    file: "iphone-1080x2340.png",
    width: 1080,
    height: 2340,
    media: portraitMedia(360, 780, 3),
  },
  // iPhone 12/13/14
  {
    file: "iphone-1170x2532.png",
    width: 1170,
    height: 2532,
    media: portraitMedia(390, 844, 3),
  },
  // iPhone 12/13 Pro Max, 14 Plus
  {
    file: "iphone-1284x2778.png",
    width: 1284,
    height: 2778,
    media: portraitMedia(428, 926, 3),
  },
  // iPhone 14 Pro / 15 / 15 Pro / 16
  {
    file: "iphone-1179x2556.png",
    width: 1179,
    height: 2556,
    media: portraitMedia(393, 852, 3),
  },
  // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  {
    file: "iphone-1290x2796.png",
    width: 1290,
    height: 2796,
    media: portraitMedia(430, 932, 3),
  },
  // iPhone 16 Pro
  {
    file: "iphone-1206x2622.png",
    width: 1206,
    height: 2622,
    media: portraitMedia(402, 874, 3),
  },
  // iPhone 16 Pro Max
  {
    file: "iphone-1320x2868.png",
    width: 1320,
    height: 2868,
    media: portraitMedia(440, 956, 3),
  },
];

export const IOS_SPLASH_PUBLIC_DIR = "/icons/splash";

export function iosSplashStartupImages(): Array<{ url: string; media: string }> {
  return IOS_SPLASH_SPECS.map((spec) => ({
    url: `${IOS_SPLASH_PUBLIC_DIR}/${spec.file}`,
    media: spec.media,
  }));
}
