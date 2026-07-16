# Google reviews setup

The website keeps every review in its original Google language. It does not translate or rewrite comments.

The `/api/google-reviews` endpoint returns the five latest reviews, the current average rating, the total review count, and a link to Google Maps.

## Required setup

1. The 305 Budapest Google Business Profile must be verified.
2. Enable the Google Business Profile API in a Google Cloud project.
3. Create OAuth credentials with the `https://www.googleapis.com/auth/business.manage` scope.
4. Generate a refresh token for a Google account that manages the location.
5. Add the variables from `.env.example` to the hosting provider as encrypted environment variables.

Never put the client secret or refresh token in public browser code or Git.

The included handler uses the Node serverless function format supported by Vercel. On another platform, keep the frontend unchanged and adapt only `api/google-reviews.js` to that provider's function format.
