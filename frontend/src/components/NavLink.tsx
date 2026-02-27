"use client";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href">, Omit<LinkProps, "href"> {
  href?: LinkProps["href"];
  activeClassName?: string;
  pendingClassName?: string;
  to?: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, href, to, end, ...props }, ref) => {
    const pathname = usePathname();
    const target = (href || to || "").toString();

    // Determine active state
    const isActive = end ? pathname === target : pathname?.startsWith(target);

    return (
      <Link
        ref={ref}
        href={target}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
