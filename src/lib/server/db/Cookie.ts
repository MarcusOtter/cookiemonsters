export default class Cookie {
	public readonly id: string;
	public readonly platform: string;
	public readonly category: string;
	public readonly name: string;
	public readonly domain: string;
	public readonly description: string;
	public readonly retention: string;
	public readonly controller: string;
	public readonly privacyLink: string | undefined;
	public readonly wildcardMatch: boolean;

	constructor(
		id: string,
		platform: string,
		category: string,
		name: string,
		domain: string,
		description: string,
		retention: string,
		controller: string,
		privacyLink: string | undefined,
		wildcardMatch: boolean,
	) {
		this.id = id;
		this.platform = platform;
		this.category = category;
		this.name = name;
		this.domain = domain;
		this.description = description;
		this.retention = retention;
		this.controller = controller;
		this.privacyLink = privacyLink;
		this.wildcardMatch = wildcardMatch;
	}
}
