import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "primary";

type BadgeProps = {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-foreground/80 dark:bg-surface-muted dark:text-muted",
  primary: "bg-blue-50 text-primary dark:bg-blue-950/40 dark:text-blue-300",
  success: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "bg-red-50 text-danger dark:bg-red-950/40 dark:text-red-300",
};

export default function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}