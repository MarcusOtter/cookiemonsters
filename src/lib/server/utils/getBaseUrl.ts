export default function getBaseUrl(urlString: string): string {
	return new URL(urlString).hostname;
}
