type AnyObject = { [key: string]: unknown };

export default function buildSearchParams(obj: AnyObject | FormData | object): URLSearchParams {
	const urlSearchParams = new URLSearchParams();
	const entries = obj instanceof FormData ? Array.from(obj.entries()) : Object.entries(obj);

	for (const [key, value] of entries) {
		urlSearchParams.append(key, String(value));
	}

	return urlSearchParams;
}
