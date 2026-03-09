import Replicate from "replicate";

const REPLICATE_MODEL =
  "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a";

/**
 * Run a single input through the CLIP model and return a 768-D embedding.
 * `input` can be an image URL or a text string.
 */
async function getClipEmbedding(input: string): Promise<number[] | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    console.warn("REPLICATE_API_TOKEN not set, skipping embedding");
    return null;
  }

  try {
    const replicate = new Replicate({ auth: apiToken });

    const output = await replicate.run(REPLICATE_MODEL, {
      input: { inputs: input },
    });

    const results = output as { embedding: number[] }[];

    if (!results || results.length === 0 || !results[0].embedding) {
      console.error("Unexpected Replicate output format");
      return null;
    }

    const embedding = results[0].embedding;

    if (embedding.length !== 768) {
      console.error(`Unexpected embedding dimension: ${embedding.length}`);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}

/**
 * Generate a CLIP image embedding via Replicate.
 * Sends an image URL and returns a 768-dimensional float array.
 */
export async function getImageEmbedding(
  imageUrl: string,
): Promise<number[] | null> {
  return getClipEmbedding(imageUrl);
}

/**
 * Generate a CLIP text embedding via Replicate.
 * Sends a text string and returns a 768-dimensional float array
 * in the same vector space as image embeddings.
 */
export async function getTextEmbedding(
  text: string,
): Promise<number[] | null> {
  return getClipEmbedding(text);
}
