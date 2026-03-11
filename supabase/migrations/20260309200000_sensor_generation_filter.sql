-- Add optional sensor_generation filter to match_recipes_by_image
CREATE OR REPLACE FUNCTION match_recipes_by_image(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  query_histogram vector(48) DEFAULT NULL,
  filter_sensor_generation text DEFAULT NULL
)
RETURNS TABLE (id bigint, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    CASE
      WHEN query_histogram IS NOT NULL AND r.color_histogram IS NOT NULL THEN
        0.4 * (1 - (r.image_embedding <=> query_embedding))
        + 0.6 * (1 - (r.color_histogram <=> query_histogram))
      ELSE
        1 - (r.image_embedding <=> query_embedding)
    END AS similarity
  FROM recipes r
  LEFT JOIN camera_models cm ON cm.id = r.camera_model_id
  WHERE r.image_embedding IS NOT NULL
    AND (filter_sensor_generation IS NULL OR cm.sensor_generation = filter_sensor_generation)
  ORDER BY
    CASE
      WHEN query_histogram IS NOT NULL AND r.color_histogram IS NOT NULL THEN
        0.4 * (r.image_embedding <=> query_embedding)
        + 0.6 * (r.color_histogram <=> query_histogram)
      ELSE
        r.image_embedding <=> query_embedding
    END
  LIMIT match_count;
$$;
