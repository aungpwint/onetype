import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link" | "brass";
type Size = "default" | "sm" | "lg" | "icon" | "icon-sm";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-accent text-accent-ink hover:bg-accent-strong shadow-sm disabled:hover:bg-accent",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-background hover:bg-muted hover:text-foreground",
  ghost: "hover:bg-muted hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  link: "text-primary underline-offset-4 hover:underline",
  brass: "bg-brass text-paper shadow-sm hover:bg-brass-strong",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-6 text-base",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const buttonClasses = ({ variant = "default", size = "default", className }: Partial<ButtonProps>) =>
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", asChild, ...props }, ref) => {
    if (asChild && props.children) {
      const child = React.Children.only(props.children) as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: buttonClasses({ variant, size, className: cn(child.props.className, className) }),
      });
    }
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses({ variant, size, className })}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
