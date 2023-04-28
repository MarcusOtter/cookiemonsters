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