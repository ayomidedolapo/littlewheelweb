export function formatHumanDate(date?: string | Date | null): string {
  if (!date) return "";
  const dt = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dt.getTime())) return "";

  const day = dt.getDate();
  const month = dt.toLocaleString("en-GB", { month: "short" }); // e.g., "Jul"
  const year = dt.getFullYear();

  const getSuffix = (d: number) => {
    if (d > 3 && d < 21) return "th";
    switch (d % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${day}${getSuffix(day)} ${month}. ${year}`;
}

export function formatTime(date?: string | Date | null): string {
  if (!date) return "";
  const dt = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dt.getTime())) return "";

  return dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatFullDateTime(date?: string | Date | null): string {
  const datePart = formatHumanDate(date);
  const timePart = formatTime(date);
  if (!datePart && !timePart) return "";
  if (datePart && timePart) return `${datePart} at ${timePart}`;
  return datePart || timePart;
}

export function daysLeft(date?: string | Date | null): number {
  if (!date) return 0;

  const target = typeof date === "string" ? new Date(date) : date;
  if (isNaN(target.getTime())) return 0;

  const now = new Date();
  const diffInMs = target.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  return Math.max(diffInDays, 0);
}

export function calculateDurationInDays(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): number {
  if (!startDate || !endDate) return 0;

  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffInMs = end.getTime() - start.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  return Math.max(diffInDays, 0);
}
