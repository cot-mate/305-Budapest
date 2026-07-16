let cachedResponse = null;
let cacheExpiresAt = 0;

const STAR_VALUES = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

const sendJson = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const getAccessToken = async () => {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) throw new Error("Google OAuth token request failed");
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
};

module.exports = async function googleReviews(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  const requiredVariables = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REFRESH_TOKEN",
    "GOOGLE_BUSINESS_ACCOUNT_ID",
    "GOOGLE_BUSINESS_LOCATION_ID",
  ];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    return sendJson(response, 503, { error: "Google reviews API is not configured" });
  }

  if (cachedResponse && Date.now() < cacheExpiresAt) {
    response.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    return sendJson(response, 200, cachedResponse);
  }

  try {
    const accessToken = await getAccessToken();
    const accountId = encodeURIComponent(process.env.GOOGLE_BUSINESS_ACCOUNT_ID);
    const locationId = encodeURIComponent(process.env.GOOGLE_BUSINESS_LOCATION_ID);
    const reviewsUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=5&orderBy=updateTime%20desc`;
    const reviewsResponse = await fetch(reviewsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!reviewsResponse.ok) throw new Error("Google Business Profile reviews request failed");
    const data = await reviewsResponse.json();
    const reviews = (data.reviews || []).slice(0, 5).map((review) => ({
      author: review.reviewer?.displayName || "Google user",
      rating: STAR_VALUES[review.starRating] || 5,
      text: review.comment || "",
      updateTime: review.updateTime || review.createTime || null,
      profilePhotoUrl: review.reviewer?.profilePhotoUrl || null,
    }));

    cachedResponse = {
      averageRating: Number(data.averageRating || 0),
      totalReviewCount: Number(data.totalReviewCount || 0),
      reviews,
      googleReviewsUrl: process.env.GOOGLE_REVIEWS_URL || "https://www.google.com/maps/search/?api=1&query=305+Budapest",
      sortedBy: "updateTime desc",
    };
    cacheExpiresAt = Date.now() + 15 * 60 * 1000;

    response.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
    return sendJson(response, 200, cachedResponse);
  } catch (error) {
    console.error("Google reviews API error", error.message);
    return sendJson(response, 502, { error: "Google reviews are temporarily unavailable" });
  }
};
