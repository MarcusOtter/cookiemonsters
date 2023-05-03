export interface GPTResult {
	"legal-jargon": boolean;
	"purpose-described": boolean;
	lang: string;
	"reject-btn": number | null;
	"accept-btn": number | null;
	"implied-consent": boolean;
}
