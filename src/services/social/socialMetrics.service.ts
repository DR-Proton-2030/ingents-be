import SocialDataModel from "../../models/socialData/socialData.model";

export async function fetchSocialMetrics(userId: string): Promise<{
  items: Array<{
    platform: string;
    metric: "followers" | "subscribers";
    count: number;
  }>;
  errors?: Array<{ platform: string; message: string }>;
}> {
  const items: Array<{
    platform: string;
    metric: "followers" | "subscribers";
    count: number;
  }> = [];
  const errors: Array<{ platform: string; message: string }> = [];

  try {
    // Fetch all social data records for the user from the database
    const allSocialData = await SocialDataModel.find({
      user_object_id: userId,
    }).exec();

    // Map each platform's data to the requested metrics format
    for (const doc of allSocialData) {
      let count = 0;
      let metric: "followers" | "subscribers" = "followers";

      try {
        if (doc.platform_name === "youtube") {
          // YouTube subscribers are stored in channel statistics
          count = Number(doc.data?.channel?.statistics?.subscriberCount || 0);
          metric = "subscribers";
        } else if (doc.platform_name === "facebook") {
          // Facebook followers are typically stored in fan_count or followers_count
          count = Number(
            doc.data?.page?.fan_count || doc.data?.page?.followers_count || 0,
          );
          metric = "followers";
        } else if (doc.platform_name === "x") {
          // X (Twitter) followers are in public_metrics
          count = Number(doc.data?.public_metrics?.followers_count || 0);
          metric = "metric" in (doc.data || {}) ? doc.data.metric : "followers"; // fallback for different possible structures
          if (doc.data?.public_metrics?.followers_count !== undefined) {
             count = Number(doc.data.public_metrics.followers_count);
          } else if (typeof doc.data === 'number') {
             count = doc.data;
          }
          metric = "followers";
        } else if (doc.platform_name === "instagram") {
          // Instagram followers
          count = Number(
            doc.data?.overview?.followersCount || doc.data?.business_discovery?.followers_count || 0,
          );
          metric = "followers";
        }

        items.push({
          platform: doc.platform_name,
          metric,
          count,
        });
      } catch (innerErr: any) {
        errors.push({
          platform: doc.platform_name,
          message: `Error parsing data from database: ${innerErr.message}`,
        });
      }
    }

  1} catch (err: any) {
    console.error("fetchSocialMetrics error:", err);
    throw new Error(`Failed to fetch social metrics from database: ${err.message}`);
  }

  return { items, errors };
}

