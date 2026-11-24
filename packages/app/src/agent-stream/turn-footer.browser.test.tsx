import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PortalProvider } from "@gorhom/portal";
import type { AgentMetric } from "@getpaseo/protocol/agent-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { FloatingPanelPortalHost } from "@/components/ui/floating-panel-portal";
import { i18n } from "@/i18n/i18next";
import type { TurnTiming } from "@/timeline/turn-time";
import type { StreamItem } from "@/types/stream";
import { createNativeStreamStrategy } from "./strategy-native";
import { CompletedTurnFooterRow } from "./turn-footer";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// A Sunday, so a turn that ended on Friday shows a weekday timestamp.
const NOW = new Date(2026, 10, 8, 5, 0);
const FRIDAY_NIGHT = new Date(2026, 10, 6, 23, 11);

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  host = document.createElement("div");
  host.style.width = "880px";
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  await i18n.changeLanguage("en");
  vi.unstubAllGlobals();
});

const reply: StreamItem = {
  kind: "assistant_message",
  id: "reply",
  text: "Done.",
  timestamp: FRIDAY_NIGHT,
};

function renderCompletedFooter(timing: TurnTiming): void {
  act(() =>
    root.render(
      <CompletedTurnFooterRow
        strategy={createNativeStreamStrategy()}
        items={[reply]}
        timing={timing}
        startIndex={0}
        supportsTimelineCursor={false}
      />,
    ),
  );
}

/** How many painted lines each footer label takes. */
function paintedLinesByLabel(element: HTMLElement): Record<string, number> {
  const lines: Record<string, number> = {};
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent ?? "";
    if (!text.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(walker.currentNode);
    lines[text] = new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size;
  }
  return lines;
}

// The footer shows both the turn duration and completion timestamp together by default.
it.each([
  {
    language: "en",
    timing: { completedAt: FRIDAY_NIGHT, durationMs: 26_000 },
    expected: "Worked for 26s · Ended Friday 11:11 PM",
  },
  {
    language: "zh-CN",
    timing: { completedAt: FRIDAY_NIGHT, durationMs: 59 * 60_000 + 58_000 },
    expected: "工作了 59m 58s · 完成于 Friday 11:11 PM",
  },
  // CJK glyphs make the combined timing label paint wider in every font.
  {
    language: "ja",
    timing: { completedAt: FRIDAY_NIGHT, durationMs: 59 * 60_000 + 58_000 },
    expected: "作業時間 59m 58s · Friday 11:11 PM 完了",
  },
])(
  "keeps the combined timing label on one line when the chat has room ($language)",
  async (input) => {
    await i18n.changeLanguage(input.language);

    renderCompletedFooter(input.timing);

    expect(paintedLinesByLabel(host)).toEqual({
      [input.expected]: 1,
    });
  },
);

const COMPLETED_TIMING: TurnTiming = { completedAt: FRIDAY_NIGHT, durationMs: 26_000 };

describe("turn stats", () => {
  const metrics: AgentMetric[] = [
    { label: "Model", value: "opus" },
    { label: "Cost", value: "$0.42", tone: "warning" },
  ];

  function renderFooterWithMetrics(turnMetrics?: AgentMetric[]): void {
    act(() =>
      root.render(
        <PortalProvider>
          <CompletedTurnFooterRow
            strategy={createNativeStreamStrategy()}
            items={[reply]}
            timing={COMPLETED_TIMING}
            startIndex={0}
            supportsTimelineCursor={false}
            turnMetrics={turnMetrics}
          />
          <FloatingPanelPortalHost />
        </PortalProvider>,
      ),
    );
  }

  it("has no trigger when the provider reported nothing for the turn", () => {
    renderFooterWithMetrics(undefined);

    expect(page.getByRole("button", { name: "Turn stats" }).elements()).toHaveLength(0);
  });

  it("shows the turn's metrics while the pointer is on the trigger", async () => {
    renderFooterWithMetrics(metrics);

    await page.getByRole("button", { name: "Turn stats" }).hover();

    const card = page.getByRole("dialog", { name: "Turn stats" });
    await expect.element(card).toBeVisible();
    await expect.element(card.getByText("Model")).toBeVisible();
    await expect.element(card.getByText("opus")).toBeVisible();
    await expect.element(card.getByText("$0.42")).toBeVisible();
  });

  it("keeps the footer's height when the trigger appears", () => {
    renderFooterWithMetrics(undefined);
    const without = host.getBoundingClientRect().height;

    renderFooterWithMetrics(metrics);

    expect(host.getBoundingClientRect().height).toBe(without);
  });
});
