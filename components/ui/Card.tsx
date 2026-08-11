import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

export default function Card({
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-sm",
        "transition-colors duration-200",
        hoverable &&
          "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md hover:border-primary-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
