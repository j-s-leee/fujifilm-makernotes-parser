import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Film Recipe Viewer",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Privacy Policy</h1>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>Last updated: March 4, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Information We Collect
          </h2>
          <p>
            When you sign in with a third-party provider (e.g. Google, GitHub),
            we receive your name, email address, and profile picture from that
            provider. We also store Fujifilm recipe data and thumbnail images
            that you upload.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            How We Use Your Information
          </h2>
          <p>
            Your information is used solely to operate the service — displaying
            your profile, storing your recipes, and enabling social features
            like bookmarks and likes. We do not sell or share your data with
            third parties for advertising purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Data Storage
          </h2>
          <p>
            Account data is stored in Supabase (hosted on AWS). Uploaded images
            are stored on Cloudflare R2. All data is transmitted over HTTPS.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Cookies</h2>
          <p>
            We use essential cookies for authentication and session management.
            No tracking or advertising cookies are used.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            Data Deletion
          </h2>
          <p>
            You can delete your recipes at any time. To delete your account and
            all associated data, please contact us.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            If you have questions about this policy, please reach out via our{" "}
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
