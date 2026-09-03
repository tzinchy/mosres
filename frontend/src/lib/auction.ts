// Rough assumption — NOT actual auction results. Moscow city auctions
// (torgi.mos.ru / investmoscow) for these flats typically close 10–30% above
// the starting price. Tune here if real data ever gets scraped.
export const AUCTION_UPLIFT_MIN = 0.1;
export const AUCTION_UPLIFT_MAX = 0.3;

export function auctionRange(startPrice: number): [number, number] {
  return [
    Math.round(startPrice * (1 + AUCTION_UPLIFT_MIN)),
    Math.round(startPrice * (1 + AUCTION_UPLIFT_MAX)),
  ];
}
