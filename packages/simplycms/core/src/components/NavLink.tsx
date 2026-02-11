"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@simplycms/core/lib/utils";

interface NavLinkProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  href: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  exact?: boolean;
  children?: React.ReactNode;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, exact, children, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = exact ? pathname === href : pathname.startsWith(href);

    return (
      <Link
        ref={ref}
        {...props}
        href={href}
        className={cn(className, isActive && activeClassName)}
      >
        {children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
export type { NavLinkProps };
