import { describe, expect, it } from "vitest";
import { collectHtmlAssetUrls } from "./warm-shell";

describe("collectHtmlAssetUrls", () => {
  it("extracts same-origin Next chunks and icons from HTML", () => {
    const html = `
      <script src="/_next/static/chunks/app/zmiany-w-rozkladzie/page.js"></script>
      <link rel="stylesheet" href="/_next/static/css/app.css" />
      <img src="/icons/logo-bus-sm.png" />
      <a href="/lekcje">Plan</a>
      <script src="https://cdn.example/x.js"></script>
    `;
    const urls = collectHtmlAssetUrls(
      html,
      "https://app.test/zmiany-w-rozkladzie",
      "https://app.test",
    );
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://app.test/_next/static/chunks/app/zmiany-w-rozkladzie/page.js",
        "https://app.test/_next/static/css/app.css",
        "https://app.test/icons/logo-bus-sm.png",
      ]),
    );
    expect(urls.some((url) => url.includes("/lekcje"))).toBe(false);
    expect(urls.some((url) => url.includes("cdn.example"))).toBe(false);
  });
});
