import { afterEach, describe, expect, it } from "vitest";
import {
  decryptTransferBlob,
  encryptTransferBlob,
  resetTransferEncryptionKeyCache,
} from "./crypto";

afterEach(() => {
  resetTransferEncryptionKeyCache();
  delete process.env.SETTINGS_TRANSFER_SECRET;
});

describe("settings-transfer crypto", () => {
  it("round-trips a payload", () => {
    process.env.SETTINGS_TRANSFER_SECRET = "test-secret-for-unit-tests";
    resetTransferEncryptionKeyCache();

    const payload = {
      v: 1,
      lessonPlan: { place: "Zatonie", days: { 1: { start: "08:00" } } },
      mzkRoute: { boardStopId: "a", alightStopId: "b", route: null },
      matchWindowMin: 45,
      createdAt: "2026-09-24T10:00:00.000Z",
    };

    const blob = encryptTransferBlob(payload);
    expect(blob.startsWith("v1.")).toBe(true);
    expect(blob.includes("Zatonie")).toBe(false);

    expect(decryptTransferBlob(blob)).toEqual(payload);
  });

  it("fails to decrypt with a different secret", () => {
    process.env.SETTINGS_TRANSFER_SECRET = "secret-a";
    resetTransferEncryptionKeyCache();
    const blob = encryptTransferBlob({ hello: "world" });

    process.env.SETTINGS_TRANSFER_SECRET = "secret-b";
    resetTransferEncryptionKeyCache();
    expect(() => decryptTransferBlob(blob)).toThrow();
  });
});
