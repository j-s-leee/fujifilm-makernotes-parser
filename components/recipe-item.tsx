import { addSign } from "@/lib/utils";

interface RecipeItemProps {
  label: string | React.ReactNode;
  value: string | number | React.ReactNode;
}

export function RecipeItem({ label, value }: RecipeItemProps) {
  const isReactNode =
    typeof value !== "string" && typeof value !== "number";

  return (
    <div className="flex flex-col gap-1 border-t border-border py-3 pr-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {isReactNode ? (
        <div className="text-sm font-medium text-foreground">{value}</div>
      ) : (
        <p className="text-sm font-medium text-foreground">
          {addSign(value)}
        </p>
      )}
    </div>
  );
}
