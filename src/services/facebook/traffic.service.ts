// Facebook does not expose traffic source breakdown comparable to YouTube.
// Return empty array and an explicit unavailability flag.

export function getTrafficSources() {
  return {
    sources: [],
    trafficSourcesUnavailable: true,
    reason: "Not available via Meta Graph API",
  };
}
