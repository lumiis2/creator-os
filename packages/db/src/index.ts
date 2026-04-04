import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is required for database client");
}

const client = new Pool({ connectionString });
client.on("error", (err) => {
	// eslint-disable-next-line no-console
	console.error("Postgres pool error:", err);
});

export const db: any = drizzle(client, { schema });
export * from "./schema";
export * from "./queries";
export { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
