import { useState } from "react";
import { ExternalLink, X, Laptop, Smartphone, Headphones, BookOpen, Plug } from "lucide-react";

/**
 * GearRecommendCard
 * A subtle, dismissible inline card that surfaces contextual Amazon affiliate
 * recommendations. Designed to feel like a mentor tip, not an ad.
 *
 * Usage: drop it at the bottom of any page where gear is genuinely useful.
 * The `variant` prop controls which links are shown.
 */

interface GearItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

const GEAR_ITEMS: Record<string, GearItem[]> = {
  coding: [
    {
      id: "laptops",
      label: "Laptops",
      icon: Laptop,
      href: "https://www.amazon.in/s?k=laptops&i=specialty-aps&srs=205735932031&crid=2PFUPMFYHXCCD&sprefix=laptop%2Cspecialty-aps%2C1865&linkCode=ll2&tag=saarthi621-21&linkId=8c1763450d06207e391d3e40d1c0f452&ref_=as_li_ss_tl",
    },
    {
      id: "laptop-accessories",
      label: "Laptop Accessories",
      icon: Plug,
      href: "https://www.amazon.in/s?k=laptop+accessories+all+gadgets&crid=3NG2ODI430B7U&sprefix=laptop++accessories%2Caps%2C350&linkCode=ll2&tag=saarthi621-21&linkId=f9b3902b5425d5b0c505b4d0a9fa0a13&ref_=as_li_ss_tl",
    },
    {
      id: "study-gadgets",
      label: "Study Gadgets",
      icon: BookOpen,
      href: "https://www.amazon.in/s?k=study+gadgets&crid=35KZ2IW041Q1Z&sprefix=study+g%2Caps%2C5253&linkCode=ll2&tag=saarthi621-21&linkId=96a36b4f085b0dc9d7fb7982650b68a9&ref_=as_li_ss_tl",
    },
  ],
  study: [
    {
      id: "study-gadgets",
      label: "Study Gadgets",
      icon: BookOpen,
      href: "https://www.amazon.in/s?k=study+gadgets&crid=35KZ2IW041Q1Z&sprefix=study+g%2Caps%2C5253&linkCode=ll2&tag=saarthi621-21&linkId=96a36b4f085b0dc9d7fb7982650b68a9&ref_=as_li_ss_tl",
    },
    {
      id: "mobile-accessories",
      label: "Mobile Accessories",
      icon: Headphones,
      href: "https://www.amazon.in/s?k=mobiles+accessories&crid=30OLDD9JRJ1E8&sprefix=mobiles+acce%2Caps%2C1168&linkCode=ll2&tag=saarthi621-21&linkId=609be412bae20a073adf134699733d62&ref_=as_li_ss_tl",
    },
    {
      id: "laptop-accessories",
      label: "Laptop Accessories",
      icon: Plug,
      href: "https://www.amazon.in/s?k=laptop+accessories+all+gadgets&crid=3NG2ODI430B7U&sprefix=laptop++accessories%2Caps%2C350&linkCode=ll2&tag=saarthi621-21&linkId=f9b3902b5425d5b0c505b4d0a9fa0a13&ref_=as_li_ss_tl",
    },
  ],
  general: [
    {
      id: "laptops",
      label: "Laptops",
      icon: Laptop,
      href: "https://www.amazon.in/s?k=laptops&i=specialty-aps&srs=205735932031&crid=2PFUPMFYHXCCD&sprefix=laptop%2Cspecialty-aps%2C1865&linkCode=ll2&tag=saarthi621-21&linkId=8c1763450d06207e391d3e40d1c0f452&ref_=as_li_ss_tl",
    },
    {
      id: "mobiles",
      label: "Smartphones",
      icon: Smartphone,
      href: "https://www.amazon.in/s?k=mobiles&i=specialty-aps&srs=205735932031&crid=ROI9GB5Z0L70&sprefix=mobiles%2Cspecialty-aps%2C350&linkCode=ll2&tag=saarthi621-21&linkId=9a72511ef6ca20bc7d3eaa0ef83bb76e&ref_=as_li_ss_tl",
    },
    {
      id: "study-gadgets",
      label: "Study Gadgets",
      icon: BookOpen,
      href: "https://www.amazon.in/s?k=study+gadgets&crid=35KZ2IW041Q1Z&sprefix=study+g%2Caps%2C5253&linkCode=ll2&tag=saarthi621-21&linkId=96a36b4f085b0dc9d7fb7982650b68a9&ref_=as_li_ss_tl",
    },
  ],
};

const STORAGE_KEY = "saarthi_gear_dismissed";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setDismissed(keys: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

interface GearRecommendCardProps {
  /** Which set of gear items to show */
  variant: "coding" | "study" | "general";
  /** Unique key to track dismissal independently per page */
  dismissKey: string;
  /** Optional mentor-style tip message */
  tip?: string;
}

export function GearRecommendCard({
  variant,
  dismissKey,
  tip,
}: GearRecommendCardProps) {
  const [dismissed, setDismissedState] = useState<boolean>(() =>
    getDismissed().includes(dismissKey)
  );

  if (dismissed) return null;

  const items = GEAR_ITEMS[variant] ?? GEAR_ITEMS.general;

  const handleDismiss = () => {
    const current = getDismissed();
    setDismissed([...current, dismissKey]);
    setDismissedState(true);
  };

  return (
    <div className="mt-8 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-foreground">
            Tools students on this path use
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
            {tip ?? "Having the right setup makes a real difference. These are affiliate links — purchases support Saarthi at no extra cost to you."}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss gear recommendations"
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Gear chips */}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              id={`gear-chip-${item.id}-${dismissKey}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/8 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary/70" />
              {item.label}
              <ExternalLink className="h-2.5 w-2.5 opacity-50" />
            </a>
          );
        })}
      </div>

      {/* Disclosure */}
      <p className="text-[10px] text-muted-foreground/50 leading-tight">
        Affiliate disclosure: Saarthi earns a small commission on Amazon purchases via these links. No extra cost to you.
      </p>
    </div>
  );
}
