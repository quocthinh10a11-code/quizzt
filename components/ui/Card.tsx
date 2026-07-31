import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

export default function Card({ hoverable = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800",
        "bg-white dark:bg-gray-900",
        "shadow-sm",
        hoverable &&
          "transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}