import {
  UserProfileHeaderSkeleton,
  GalleryGridSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        <UserProfileHeaderSkeleton />
        <GalleryGridSkeleton />
      </div>
    </div>
  );
}
