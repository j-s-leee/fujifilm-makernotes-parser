export interface GalleryRecipe {
  id: number;
  simulation: string | null;
  thumbnail_path: string | null;
  bookmark_count: number;
  like_count: number;
  created_at: string | null;
  grain_roughness: string | null;
  grain_size: string | null;
  highlight: string | null;
  shadow: string | null;
  color: string | null;
  sharpness: string | null;
  dynamic_range_development: string | null;
  user_id: string | null;
  camera_model: string | null;
}

export interface RecipeGroup {
  primary: GalleryRecipe;
  recipes: GalleryRecipe[];
  count: number;
}

const GROUP_KEYS = [
  "simulation",
  "grain_roughness",
  "grain_size",
  "highlight",
  "shadow",
  "color",
  "sharpness",
  "dynamic_range_development",
] as const;

export function groupRecipes(recipes: GalleryRecipe[]): RecipeGroup[] {
  const map = new Map<string, GalleryRecipe[]>();

  for (const recipe of recipes) {
    const key = JSON.stringify(GROUP_KEYS.map((k) => recipe[k] ?? null));
    const group = map.get(key);
    if (group) {
      group.push(recipe);
    } else {
      map.set(key, [recipe]);
    }
  }

  return Array.from(map.values()).map((group) => ({
    primary: group[0],
    recipes: group,
    count: group.length,
  }));
}
