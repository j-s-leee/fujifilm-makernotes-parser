import { ScanLine, ImageIcon, MessageSquareText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function FeatureShowcase() {
  const t = useTranslations("home.features");

  const features = [
    {
      icon: ScanLine,
      title: t("extractTitle"),
      description: t("extractDescription"),
      href: "/extract",
      cta: t("learnMore"),
    },
    {
      icon: ImageIcon,
      title: t("imageSearchTitle"),
      description: t("imageSearchDescription"),
      href: "/search",
      cta: t("learnMore"),
    },
    {
      icon: MessageSquareText,
      title: t("textSearchTitle"),
      description: t("textSearchDescription"),
      href: "/search",
      cta: t("learnMore"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {features.map((feature) => (
        <Link
          key={feature.title}
          href={feature.href}
          className="group flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-foreground/20 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <feature.icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{feature.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
          <span className="mt-auto text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            {feature.cta} &rarr;
          </span>
        </Link>
      ))}
    </div>
  );
}
