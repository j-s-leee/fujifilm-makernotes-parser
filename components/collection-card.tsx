import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

interface CollectionCardProps {
  collection: {
    id: number;
    name: string;
    description: string | null;
    is_public: boolean;
    item_count: number;
    user_display_name: string | null;
    user_username: string | null;
  };
  coverImages: string[];
}

export function CollectionCard({ collection, coverImages }: CollectionCardProps) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
    >
      {/* Cover mosaic */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {coverImages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No recipes yet
          </div>
        )}
        {coverImages.length === 1 && (
          <Image
            src={coverImages[0]}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        )}
        {coverImages.length === 2 && (
          <div className="grid h-full grid-cols-2">
            {coverImages.map((src, i) => (
              <div key={i} className="relative">
                <Image src={src} alt="" fill className="object-cover" sizes="25vw" />
              </div>
            ))}
          </div>
        )}
        {coverImages.length >= 3 && (
          <div className="grid h-full grid-cols-2 grid-rows-2">
            {coverImages.slice(0, 4).map((src, i) => (
              <div key={i} className="relative">
                <Image src={src} alt="" fill className="object-cover" sizes="20vw" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{collection.name}</span>
          {!collection.is_public && (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{collection.item_count} recipes</span>
          {collection.user_display_name && (
            <>
              <span>·</span>
              <span>{collection.user_display_name}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
