import Database from "better-sqlite3";
/**
 * DatabaseManager handles SQLite connections with atomic file swap detection.
 *
 * The ETL process atomically swaps the DB file (new.db -> star_schema.db).
 * This manager detects changes via inode/mtime and reconnects as needed.
 */
declare class DatabaseManager {
    private db;
    private lastStat;
    private readonly dbPath;
    constructor(dbPath?: string);
    /**
     * Get a database connection, reconnecting if the file has changed.
     */
    getConnection(): Database.Database;
    /**
     * Close the database connection.
     */
    close(): void;
}
/**
 * Get the database connection.
 * Automatically handles file swap detection.
 */
export declare function getDatabase(): Database.Database;
export { DatabaseManager };
//# sourceMappingURL=connection.d.ts.map