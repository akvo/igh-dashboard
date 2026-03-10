import { getDatabase } from "../connection.js";

export function getLastSyncDate(): string | null {
  const db = getDatabase();
  try {
    const row = db
      .prepare(`SELECT value FROM _etl_metadata WHERE key = ?`)
      .get("last_sync_date") as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    // Table may not exist in older star_schema.db files
    return null;
  }
}
