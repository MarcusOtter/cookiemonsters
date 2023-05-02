export default function isValidUrl(url: string): boolean {
	try {
		return Boolean(new URL(url));
	} catch (e) {
		return false;
	}
}
