import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import crypto from "crypto";
import type BannerSelector from "./BannerSelector";
import getBaseUrl from "../utils/getBaseUrl";

export default class Db {
	private static connection: Database<sqlite3.Database, sqlite3.Statement> | undefined;

	public async init() {
		if (Db.connection) {
			return;
		}

		Db.connection = await open({
			filename: "./database.sqlite",
			driver: sqlite3.Database,
		});

		console.log("Database connection opened.");

		await this.createTables(Db.connection);
	}

	// TODO: Do not take the screenshot here, just take full url
	public async getSelector(fullUrl: string, screenshotBase64: string) {
		const baseUrl = getBaseUrl(fullUrl);
		const checksum = this.getChecksum(baseUrl, screenshotBase64);
		const result = await Db.connection?.get<BannerSelector>(
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

	private async createTables(database: Database<sqlite3.Database, sqlite3.Statement>) {
		await database.exec("PRAGMA foreign_keys = ON;");

		await database.exec(`
			CREATE TABLE IF NOT EXISTS "BannerSelector" (
				"id"			INTEGER NOT NULL UNIQUE,
				"url"			TEXT NOT NULL,
				"createdAtUtc"	TEXT NOT NULL,
				"checksum"		TEXT NOT NULL UNIQUE,
				"selector"		TEXT NOT NULL,
				
				PRIMARY KEY("id" AUTOINCREMENT)
			);
	
			CREATE UNIQUE INDEX IF NOT EXISTS "index_checksum" ON "BannerSelector" (
				"checksum"	ASC
			);
		`);

		await database.exec(`
			CREATE TABLE IF NOT EXISTS "Cookie" (
				"id"			TEXT NOT NULL UNIQUE,
				"platform"		TEXT NOT NULL,
				"category"		TEXT NOT NULL,
				"name"			TEXT NOT NULL,
				"domain"		TEXT NOT NULL,
				"description"	TEXT NOT NULL,
				"retention"		TEXT NOT NULL,
				"controller"	TEXT NOT NULL,
				"privacyLink"	TEXT,
				"wildcardMatch"	INTEGER NOT NULL,
	
				PRIMARY KEY("id")
			)
		`);

		// TODO: Add indices for Cookie table
	}
}
