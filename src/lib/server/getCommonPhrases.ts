export function getCommonPhrases(): { language: string; phrases: string[] }[] {
	return [
		{ language: "fi", phrases: ["eväste", "salli", "kiellä", "hyväksy", "tunniste"] },
		{ language: "en", phrases: ["cookie", "Accept", "Decline"] },
		{ language: "es", phrases: ["cookie", "Aceptar", "Rechazar"] },
		{ language: "fr", phrases: ["cookie", "Accepter", "Refuser"] },
		{
			language: "sv",
			phrases: ["cookie", "Godkänn", "Avvisa", "Neka", "Hantera", "kakor", "samtyck", "personuppgift"],
		},
	];
}

export function getUniqueCommonPhrases(): string[] {
	return [...new Set(getCommonPhrases().flatMap((full) => full.phrases))];
}
