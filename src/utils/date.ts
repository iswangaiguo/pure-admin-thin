import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return dayjs.utc(value).local().format("YYYY-MM-DD HH:mm:ss");
}
