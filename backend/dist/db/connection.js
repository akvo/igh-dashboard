import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
/**
 * DatabaseManager handles SQLite connections with atomic file swap detection.
 *
 * The ETL process atomically swaps the DB file (new.db -> star_schema.db).
 * This manager detects changes via inode/mtime and reconnects as needed.
 */
class DatabaseManager {
    db = null;
    lastStat = null;
    dbPath;
    constructor(dbPath) {
        // Default path: star_schema.db in the graphql-api root
        this.dbPath = dbPath || path.resolve(import.meta.dirname, "..", "..", "star_schema.db");
    }
    /**
     * Get a database connection, reconnecting if the file has changed.
     */
    getConnection() {
        let stat;
        try {
            stat = fs.statSync(this.dbPath);
        }
        catch {
            throw new Error(`Database file not found: ${this.dbPath}`);
        }
        const changed = !this.lastStat || stat.ino !== this.lastStat.ino || stat.mtimeMs !== this.lastStat.mtimeMs;
        if (changed || !this.db) {
            if (this.db) {
                this.db.close();
            }
            this.db = new Database(this.dbPath, { readonly: true });
            this.lastStat = { ino: stat.ino, mtimeMs: stat.mtimeMs };
        }
        return this.db;
    }
    /**
     * Close the database connection.
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.lastStat = null;
        }
    }
}
// Singleton instance
const dbManager = new DatabaseManager();
/**
 * Get the database connection.
 * Automatically handles file swap detection.
 */
export function getDatabase() {
    return dbManager.getConnection();
}
export { DatabaseManager };
//# sourceMappingURL=connection.js.map