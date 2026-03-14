import {
  UserProfileHeaderSkeleton,
  GalleryGridSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8">
        <UserProfileHeaderSkeleton />
        <GalleryGridSkeleton />
      </div>
    </div>
  );
}
