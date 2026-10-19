import { describe, expect, it } from "vitest";
import {
  deviceDisplayName,
  pushEndpointLabel,
  thisDeviceBrowserLabel,
  thisDeviceLabel,
} from "./device-label";

describe("pushEndpointLabel", () => {
  it("maps Apple, FCM, Mozilla, and Windows hosts", () => {
    expect(
      pushEndpointLabel("https://web.push.apple.com/ABC123"),
    ).toBe("Safari (Apple)");
    expect(
      pushEndpointLabel(
        "https://fcm.googleapis.com/fcm/send/dXyz_long_token",
      ),
    ).toBe("Chrome / Android");
    expect(
      pushEndpointLabel(
        "https://updates.push.services.mozilla.com/wpush/v2/token",
      ),
    ).toBe("Firefox");
    expect(
      pushEndpointLabel(
        "https://wns2-pn1p.notify.windows.com/w/?token=abc",
      ),
    ).toBe("Edge / Windows");
  });

  it("falls back for unknown or invalid endpoints", () => {
    expect(pushEndpointLabel("https://push.example.invalid/x")).toBe(
      "Inna przeglądarka",
    );
    expect(pushEndpointLabel("not-a-url")).toBe("Inna przeglądarka");
  });
});

describe("thisDeviceBrowserLabel / thisDeviceLabel", () => {
  it("detects common desktop and mobile agents", () => {
    expect(
      thisDeviceBrowserLabel(
        "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome");
    expect(
      thisDeviceBrowserLabel(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Edg/120.0.0.0",
      ),
    ).toBe("Edge");
    expect(
      thisDeviceBrowserLabel(
        "Mozilla/5.0 (Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome (Android)");
    expect(
      thisDeviceBrowserLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari (iPhone)");
  });

  it("prefixes current device title", () => {
    expect(
      thisDeviceLabel(
        "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Firefox/121.0",
      ),
    ).toBe("To urządzenie · Firefox");
  });
});

describe("deviceDisplayName", () => {
  it("marks the matching endpoint as current", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/token";
    expect(deviceDisplayName(endpoint, endpoint)).toEqual({
      title: expect.stringContaining("To urządzenie"),
      isCurrent: true,
    });
    expect(deviceDisplayName(endpoint, "https://other.example/x")).toEqual({
      title: "Chrome / Android",
      isCurrent: false,
    });
  });
});
