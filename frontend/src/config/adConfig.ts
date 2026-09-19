/**
 * Centralized Monetization & Ad Network Configuration
 * Supports Monetag, Google AdSense, Carbon Ads, or Custom Publisher Tags.
 */

export const AD_CONFIG = {
  // Set to true when you paste your new ad network scripts
  enabled: false,

  // Primary Native / Banner Tag (e.g. Monetag In-Page Push or Native Banner)
  primaryBannerScript: "",
  primaryContainerId: "monetag-ad-container",

  // Secondary Banner / Rectangle Unit (e.g. 300x250 or 728x90)
  secondaryBannerScript: "",
};
