import type { Protocol } from "puppeteer";
import type Cookie from "./server/db/Cookie";

export type CookieResult = {
	ClientCookie: Protocol.Network.Cookie;
	CookieObject: Cookie | undefined;
};
