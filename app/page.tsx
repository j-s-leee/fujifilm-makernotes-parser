"use client";

import ImageUploader from "./components/ImageUploader";

//
// Main Component
//
export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Fujifilm Recipe Viewer
          </h1>
          <p className="text-muted-foreground">
            Upload your Fujifilm camera photos to view the film simulation
            recipe
          </p>
        </div>
        <ImageUploader />
      </div>
    </main>
  );
}
