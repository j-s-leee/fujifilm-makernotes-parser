// Select column constants to avoid fetching heavy fields (image_embedding, color_histogram)

// GalleryCard: columns needed for gallery grid display
export const GALLERY_SELECT =
  "id, user_id, simulation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, bookmark_count, like_count, camera_model, created_at, user_display_name, user_username, user_avatar_path, slug";

// Recipe detail page: Hero + Settings modal + similar recipe lookup
export const RECIPE_DETAIL_SELECT =
  "id, user_id, simulation, sensor_generation, thumbnail_path, blur_data_url, thumbnail_width, thumbnail_height, camera_model, lens_model, bookmark_count, like_count, recipe_hash, dynamic_range_development, grain_roughness, grain_size, color_chrome, color_chrome_fx_blue, wb_type, wb_color_temperature, wb_red, wb_blue, highlight, shadow, color, sharpness, noise_reduction, clarity, bw_adjustment, bw_magenta_green, user_display_name, user_username, user_avatar_path, slug";

