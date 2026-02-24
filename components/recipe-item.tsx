import { addSign } from "@/lib/utils";

interface RecipeItemProps {
  label: string | React.ReactNode;
  value: string | number;
}

export function RecipeItem({ label, value }: RecipeItemProps) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-3 pr-2">
      <p className="text-xs font-normal uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold uppercase text-foreground">
        {addSign(value)}
      </p>
    </div>
  );
}
