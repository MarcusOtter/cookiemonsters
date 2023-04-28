import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import crypto from "crypto";
import type BannerSelector from "./BannerSelector";
import getBaseUrl from "../utils/getBaseUrl";

import insert_cookies from "./sql/insert_cookies.sql?raw";
import create_tables from "./sql/create_tables.sql?raw";

type DbConnection = Database<sqlite3.Database, sqlite3.Statement>;

export default class Db {
	private static connection: DbConnection;

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

	// TODO: Do not take the screenshot here, just take full url
	public async getSelector(fullUrl: string, screenshotBase64: string) {
		const baseUrl = getBaseUrl(fullUrl);
		const checksum = this.getChecksum(baseUrl, screenshotBase64);
		const result = await Db.connection.get<BannerSelector>(
			`SELECT * FROM "BannerSelector" WHERE "checksum" = ?`,
			checksum,
		);

		return result;
	}

	public async insertSelector(fullUrl: string, screenshotBase64: string, selector: string) {
		const baseUrl = getBaseUrl(fullUrl);
		const checksum = this.getChecksum(baseUrl, screenshotBase64);
		const result = await Db.connection?.run(
			`INSERT INTO "BannerSelector" ("url", "createdAtUtc", "checksum", "selector") VALUES (?, ?, ?, ?)`,
			fullUrl,
			new Date().toISOString(),
			checksum,
			selector,
		);

		return result;
	}

	/** Gets a SHA1 checksum of (baseUrl + screenshotBase64) */
	private getChecksum(baseUrl: string, screenshotBase64: string) {
		const hash = crypto.createHash("sha1");
		hash.update(baseUrl);
		hash.update(screenshotBase64);
		return hash.digest("hex");
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
