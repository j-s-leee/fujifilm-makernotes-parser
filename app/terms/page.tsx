import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Film Recipe Viewer",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">
        Terms of Service
      </h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: March 4, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Acceptance of Terms
          </h2>
          <p>
            By accessing or using Film Recipe Viewer, you agree to be bound by
            these terms. If you do not agree, please do not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Use of Service
          </h2>
          <p>
            Film Recipe Viewer allows you to extract, view, and share Fujifilm
            film simulation recipes from image EXIF data. You may use the
            service for personal, non-commercial purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            User Content
          </h2>
          <p>
            You retain ownership of the images and recipes you upload. By
            publishing a recipe to the gallery, you grant other users the right
            to view and bookmark it. You are responsible for ensuring you have
            the right to upload any content you submit.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Prohibited Conduct
          </h2>
          <p>You agree not to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Upload content that is illegal, harmful, or infringes on the rights of others</li>
            <li>Attempt to gain unauthorized access to the service or other users&apos; accounts</li>
            <li>Use automated tools to scrape or overload the service</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Disclaimer
          </h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. We do not guarantee the accuracy of extracted recipe data. We
            reserve the right to modify or discontinue the service at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Termination
          </h2>
          <p>
            We may suspend or terminate your access if you violate these terms.
            You may stop using the service and request account deletion at any
            time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about these terms? Reach out via our{" "}
            <a
              href="https://tally.so/r/wLqO0J"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              contact form
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
