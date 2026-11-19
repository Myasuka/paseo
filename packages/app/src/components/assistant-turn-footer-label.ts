import type { TFunction } from "i18next";
import { formatDuration, formatMessageTimestamp } from "@/utils/time";

export function getTurnDurationLabel(durationMs: number, t: TFunction): string {
  return t("message.turnFooter.workedFor", { duration: formatDuration(durationMs) });
}

export function getTurnFooterTimingLabel(
  input: { durationMs?: number | null; completedAt?: Date; now?: Date },
  t: TFunction,
): string {
  const hasDuration = input.durationMs !== undefined && input.durationMs !== null;
  const duration = hasDuration ? formatDuration(input.durationMs!) : "";
  const timestamp = input.completedAt ? formatMessageTimestamp(input.completedAt, input.now) : "";

  if (duration && timestamp) {
    return t("message.turnFooter.workedForAt", { duration, timestamp });
  }
  if (duration) {
    return t("message.turnFooter.workedFor", { duration });
  }
  if (timestamp) {
    return t("message.turnFooter.completedAt", { timestamp });
  }
  return "";
}
