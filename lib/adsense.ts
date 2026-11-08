/** AdSense publisher ID, e.g. "ca-pub-1234567890123456". Unset = ads disabled. */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** Ad unit slot for in-feed cards inside gallery grids. Unset = no feed ads. */
export const ADSENSE_FEED_SLOT = process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT;

/** Insert one ad card after every N recipe cards in gallery grids. */
export const FEED_AD_INTERVAL = 12;

/** Shorter interval for recommendation results (default 10 results). */
export const RECOMMEND_AD_INTERVAL = 5;
