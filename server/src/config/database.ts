import mongoose from "mongoose";
import type { Db } from "mongodb";

/**
 * Get MongoDB database connection
 * Ensures a valid database handle is returned or throws if not connected.
 */
export function getDB(): Db {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error("Database not connected");
    }
    return db as Db;
}
