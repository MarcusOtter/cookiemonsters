import type BannerFinder from "./BannerFinder";
import MarcusBannerFinder from "./MarcusBannerFinder";
import OliverBannerFinder from "./OliverBannerFinder";

export default function getBannerFinders(): BannerFinder[] {
	return [new OliverBannerFinder(), new MarcusBannerFinder()];
}
