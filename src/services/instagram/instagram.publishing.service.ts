import fetch from "node-fetch";

export class InstagramPublishingService {
  /**
   * Publishes media to Instagram using the direct graph.instagram.com API.
   * Assumes the user token has the `instagram_business_content_publish` scope.
   */
  static async publishMedia(userId: string, accessToken: string, imageUrl: string, caption: string): Promise<string> {
    try {
      // Step 1: Create Media Container
      const createUrl = `https://graph.instagram.com/v19.0/${userId}/media?image_url=${encodeURIComponent(
        imageUrl
      )}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`;
      
      const createRes = await fetch(createUrl, { method: "POST" });
      const createData = await createRes.json();

      if (createData.error) {
        throw new Error(
          `Meta API Error [Container Creation]: ${createData.error.message} (Code: ${createData.error.code})`
        );
      }

      const creationId = createData.id;

      // Wait a few seconds for Meta to process the image/video container
      // If it's a video, this delay might need to be longer or polled, but for images 5s is usually safe.
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Step 2: Publish Media Container
      const publishUrl = `https://graph.instagram.com/v19.0/${userId}/media_publish?creation_id=${creationId}&access_token=${accessToken}`;
      
      const publishRes = await fetch(publishUrl, { method: "POST" });
      const publishData = await publishRes.json();

      if (publishData.error) {
        throw new Error(
          `Meta API Error [Media Publish]: ${publishData.error.message} (Code: ${publishData.error.code}, Subcode: ${publishData.error.error_subcode})`
        );
      }

      return publishData.id;
    } catch (err: any) {
      console.error("[InstagramPublishingService] Publish Error:", err);
      throw err;
    }
  }
}
