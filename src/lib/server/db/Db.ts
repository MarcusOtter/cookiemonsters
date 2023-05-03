import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import type BannerSelector from "./BannerSelector";

import insert_cookies from "./sql/insert_cookies.sql?raw";
import create_tables from "./sql/create_tables.sql?raw";

export default class Db {
	private static connection: Database<sqlite3.Database, sqlite3.Statement>;

	// Do not forget to invoke this method as soon as Db is created
	public async init() {
		if (Db.connection) {
			return;
		}

		Db.connection = await open({
			filename: "./database.sqlite",
			driver: sqlite3.Database,
		});

		console.log("Database connection opened.");
		await this.createTables();
	}

	public async getSelector(options: { fullUrl?: string; hostname?: string }) {
		return await Db.connection.get<BannerSelector>(
			`SELECT * FROM "BannerSelector"
			WHERE ${options.fullUrl ? "url" : "hostname"} = ?
			ORDER BY createdAtUtc DESC
			LIMIT 1`,
			options.fullUrl ? options.fullUrl : options.hostname,
		);
	}

	public async addSelector(selector: BannerSelector) {
		await Db.connection?.run(
			`
			INSERT INTO BannerSelector (url, hostname, createdAtUtc, checksum, text) VALUES (?, ?, ?, ?, ?)
			`,
			selector.url,
			selector.hostname,
			selector.createdAtUtc,
			selector.checksum,
			selector.text,
		);
	}

	private async isTableEmpty(tableName: string): Promise<boolean> {
		const result = await Db.connection.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${tableName}`);
		return result?.count === 0;
	}

	private async createTables() {
		const conn = Db.connection;

		await conn.exec("PRAGMA foreign_keys = ON;");
		await conn.exec(create_tables);

		// Insert all the cookies if the table is empty
		if (await this.isTableEmpty("Cookie")) {
			await conn.exec(insert_cookies);
		}

		// TODO: Add indices for Cookie table (in the create_tables.sql file)
	}
}
