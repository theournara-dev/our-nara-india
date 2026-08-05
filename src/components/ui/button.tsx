import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

/**
 * Lightweight Button that renders as an <a> when given an `href` (for links /
 * client navigation) and a <button> otherwise, with the same visual variants.
 */

const variantClasses = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:outline-zinc-900",
  outline:
    "border border-zinc-300 text-zinc-900 hover:border-zinc-900 hover:bg-zinc-50 focus-visible:outline-zinc-900",
  ghost: "text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-900",
  accent:
    "bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-amber-600",
} as const;

const sizeClasses = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
} as const;

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
}
interface ButtonNativeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: undefined;
  variant?: Variant;
  size?: Size;
}

export type ButtonProps = ButtonLinkProps | ButtonNativeProps;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (props.href !== undefined) {
    const { href, ...anchorProps } = props as ButtonLinkProps;
    return <a href={href} className={classes} {...anchorProps} />;
  }

  return <button className={classes} {...(props as ButtonNativeProps)} />;
}
