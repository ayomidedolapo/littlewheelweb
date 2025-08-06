import {
  formatHumanDate,
  formatTime,
  formatFullDateTime,
} from "@littlewheel/lib/format-date";

interface DateFormatterToTextProps {
  date?: string | Date | null;
  prefix?: string;
  className?: string;
  mode?: "date" | "time" | "datetime";
}

export default function DateFormatterToText({
  date,
  prefix = "",
  className = "",
  mode = "date",
}: DateFormatterToTextProps) {
  let formatted = "";

  if (mode === "date") formatted = formatHumanDate(date);
  else if (mode === "time") formatted = formatTime(date);
  else if (mode === "datetime") formatted = formatFullDateTime(date);

  if (!formatted) return null;

  return (
    <p className={className}>{prefix ? `${prefix} ${formatted}` : formatted}</p>
  );
}
