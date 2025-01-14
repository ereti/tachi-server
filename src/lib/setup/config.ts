// barrel file for re-exporting env variables.
import dotenv from "dotenv";
import JSON5 from "json5";
import fs from "fs";
import p from "prudence";
import { FormatPrError } from "utils/prudence";
import { integer, StaticConfig } from "tachi-common";
dotenv.config(); // imports things like NODE_ENV from a local .env file if one is present.

// stub - having a real logger here creates a circular dependency.
const logger = console; // CreateLogCtx(__filename);

const confLocation = process.env.TCHIS_CONF_LOCATION ?? "./conf.json5";

// reads from $pwd/conf.json5, unless an override is set
let confFile;

try {
	confFile = fs.readFileSync(confLocation, "utf-8");
} catch (err) {
	logger.error("Error while trying to open conf.json5. Is one present?", { err });
	process.exit(1);
}

const config = JSON5.parse(confFile);

function isValidURL(self: unknown) {
	if (typeof self !== "string") {
		return `Expected URL, received type ${typeof self}`;
	}

	try {
		new URL(self);
		return true;
	} catch (err) {
		return `Invalid URL ${self}.`;
	}
}

export interface OAuth2Info {
	CLIENT_ID: string;
	CLIENT_SECRET: string;
	REDIRECT_URI: string;
}

export interface TachiConfig {
	MONGO_DATABASE_NAME: string;
	LOG_LEVEL: "debug" | "verbose" | "info" | "warn" | "error" | "severe" | "crit";
	CAPTCHA_SECRET_KEY: string;
	SESSION_SECRET: string;
	FLO_API_URL?: string;
	EAG_API_URL?: string;
	MIN_API_URL?: string;
	ARC_API_URL?: string;
	FLO_OAUTH2_INFO?: OAuth2Info;
	EAG_OAUTH2_INFO?: OAuth2Info;
	MIN_OAUTH2_INFO?: OAuth2Info;
	ARC_AUTH_TOKEN?: string;
	TYPE: "ktchi" | "btchi" | "omni";
	ENABLE_SERVER_HTTPS?: boolean;
	RUN_OWN_CDN?: boolean;
	CLIENT_DEV_SERVER?: string | null;
	SERVER_TYPE_INFO: StaticConfig.ServerConfig;
	RATE_LIMIT: integer;
	OAUTH_CLIENT_CAP: integer;
	OPTIONS_ALWAYS_SUCCEEDS?: boolean;
	NO_CONSOLE?: boolean;
	EMAIL_CONFIG?: {
		FROM: string;
		SENDMAIL_BIN?: string;
	};
	USC_QUEUE_SIZE: integer;
	BEATORAJA_QUEUE_SIZE: integer;
	OUR_URL: string;
	LOGGER_DISCORD_WEBHOOK?: string;
	DISCORD_WHO_TO_TAG?: string[];
}

const isValidOauth2 = p.optional({
	CLIENT_ID: "string",
	CLIENT_SECRET: "string",
	REDIRECT_URI: "string",
});

const err = p(config, {
	MONGO_DATABASE_NAME: "string",
	LOG_LEVEL: p.isIn("debug", "verbose", "info", "warn", "error", "severe", "crit"),
	CAPTCHA_SECRET_KEY: "string",
	SESSION_SECRET: "string",
	FLO_API_URL: p.optional(isValidURL),
	EAG_API_URL: p.optional(isValidURL),
	MIN_API_URL: p.optional(isValidURL),
	ARC_API_URL: p.optional(isValidURL),
	FLO_OAUTH2_INFO: isValidOauth2,
	EAG_OAUTH2_INFO: isValidOauth2,
	MIN_OAUTH2_INFO: isValidOauth2,
	ARC_AUTH_TOKEN: "*string",
	ENABLE_SERVER_HTTPS: "*boolean",
	RUN_OWN_CDN: "*boolean",
	CLIENT_DEV_SERVER: "*?string",
	TYPE: p.isIn("ktchi", "btchi", "omni"),
	RATE_LIMIT: p.optional(p.isPositiveInteger),
	OAUTH_CLIENT_CAP: p.optional(p.isPositiveInteger),
	OPTIONS_ALWAYS_SUCCEEDS: "*boolean",
	NO_CONSOLE: "*boolean",
	EMAIL_CONFIG: p.optional({
		FROM: "string",
		SENDMAIL_BIN: "*string",
	}),
	USC_QUEUE_SIZE: p.optional(p.gteInt(2)),
	BEATORAJA_QUEUE_SIZE: p.optional(p.gteInt(2)),
	OUR_URL: "string",
	LOGGER_DISCORD_WEBHOOK: "*string",
	DISCORD_WHO_TO_TAG: p.optional(["string"]),
});

if (err) {
	throw FormatPrError(err, "Invalid conf.json5 file.");
}

if (config.TYPE === "ktchi") {
	config.SERVER_TYPE_INFO = StaticConfig.KTCHI_CONFIG;
} else if (config.TYPE === "btchi") {
	config.SERVER_TYPE_INFO = StaticConfig.BTCHI_CONFIG;
} else if (config.TYPE === "omni") {
	config.SERVER_TYPE_INFO = StaticConfig.OMNI_CONFIG;
}

const tachiConfig = config as TachiConfig;

// default rate limit 500
tachiConfig.RATE_LIMIT ??= 500;
tachiConfig.OAUTH_CLIENT_CAP ??= 15;
tachiConfig.USC_QUEUE_SIZE ??= 3;
tachiConfig.BEATORAJA_QUEUE_SIZE ??= 3;

if (tachiConfig.EMAIL_CONFIG) {
	tachiConfig.EMAIL_CONFIG.SENDMAIL_BIN ??= "/usr/bin/sendmail";
}

export const ServerTypeInfo = tachiConfig.SERVER_TYPE_INFO;
export const ServerConfig = tachiConfig;

// Environment Variable Validation

let port = Number(process.env.PORT);
if (Number.isNaN(port)) {
	logger.warn(`No/invalid PORT specified in environment, defaulting to 8080.`);
	port = 8080;
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
	logger.error(`No REDIS_URL specified in environment. Terminating.`);
	process.exit(1);
}

const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
	logger.error(`No MONGO_URL specified in environment. Terminating.`);
	process.exit(1);
}

const cdnRoot = process.env.CDN_FILE_ROOT;
if (!cdnRoot) {
	logger.error(`No CDN_FILE_ROOT specified in environment. Terminating.`);
	process.exit(1);
}

export const Environment = {
	port,
	redisUrl,
	mongoUrl,
	// If node_env is test, force to ./test-cdn.
	cdnRoot: process.env.NODE_ENV === "test" ? "./test-cdn" : cdnRoot,
};
