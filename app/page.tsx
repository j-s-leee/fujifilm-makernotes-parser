"use client";

import ImageUploader from "./components/ImageUploader";

//
// Main Component
//
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16 max-w-7xl">
        <div className="text-center space-y-4 mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Fujifilm Recipe Viewer
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Upload your Fujifilm camera photos to view and share your film
            simulation recipe
          </p>
        </div>
        <div className="max-w-5xl mx-auto">
          <ImageUploader />
        </div>
      </div>
    </main>
  );
}
