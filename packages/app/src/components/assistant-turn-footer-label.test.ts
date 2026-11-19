import { describe, expect, it } from "vitest";

import { i18n } from "@/i18n/i18next";
import { formatMessageTimestamp } from "@/utils/time";
import { getTurnDurationLabel, getTurnFooterTimingLabel } from "./assistant-turn-footer-label";

describe("getTurnDurationLabel", () => {
  it("says how long the turn worked", () => {
    expect(getTurnDurationLabel(14_000, i18n.t)).toBe("Worked for 14s");
  });

  it("reads in the active app language", async () => {
    await i18n.changeLanguage("fr");
    try {
      expect(getTurnDurationLabel(14_000, i18n.t)).toBe("A travaillé pendant 14s");
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});

describe("getTurnFooterTimingLabel", () => {
  it("shows both duration and minute-level completion timestamp in en and zh-CN", async () => {
    const now = new Date(2026, 10, 19, 15, 0, 0);
    const completedAt = new Date(2026, 10, 19, 14, 35, 42);
    const expectedTimestamp = formatMessageTimestamp(completedAt, now);

    // Minute precision only: no ":42" seconds component in the formatted timestamp.
    expect(expectedTimestamp).not.toMatch(/:\d{2}:\d{2}/);
    expect(getTurnFooterTimingLabel({ durationMs: 132_000, completedAt, now }, i18n.t)).toBe(
      `Worked for 2m 12s · Ended ${expectedTimestamp}`,
    );

    await i18n.changeLanguage("zh-CN");
    try {
      expect(getTurnFooterTimingLabel({ durationMs: 132_000, completedAt, now }, i18n.t)).toBe(
        `工作了 2m 12s · 完成于 ${expectedTimestamp}`,
      );
      expect(getTurnFooterTimingLabel({ completedAt, now }, i18n.t)).toBe(
        `完成于 ${expectedTimestamp}`,
      );
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("falls back cleanly when only one timing value or neither is present", () => {
    const now = new Date(2026, 10, 19, 15, 0, 0);
    const completedAt = new Date(2026, 10, 17, 23, 15, 9);
    const expectedTimestamp = formatMessageTimestamp(completedAt, now);

    expect(getTurnFooterTimingLabel({ durationMs: 47_000, now }, i18n.t)).toBe("Worked for 47s");
    expect(getTurnFooterTimingLabel({ completedAt, now }, i18n.t)).toBe(
      `Ended ${expectedTimestamp}`,
    );
    expect(getTurnFooterTimingLabel({ durationMs: null, now }, i18n.t)).toBe("");
  });
});
