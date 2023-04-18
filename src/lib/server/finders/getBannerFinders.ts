import type BannerFinder from "./BannerFinder";
import MarcusScoreFinder from "./MarcusScoreFinder";
import OliverBannerFinder from "./OliverBannerFinder";

export default function getBannerFinders(): BannerFinder[] {
	// The order determines which banner finder is used first and how they appear in the dropdown
	return [new OliverBannerFinder(), new MarcusScoreFinder()];
}
