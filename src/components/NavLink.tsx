 "use client";

 import Link, { type LinkProps } from "next/link";
 import { usePathname } from "next/navigation";
 import { forwardRef } from "react";
 import { cn } from "@/lib/utils";

 type NavLinkCompatProps = Omit<LinkProps, "className" | "href"> & {
   href?: LinkProps["href"];
   to?: LinkProps["href"];
   className?: string;
   activeClassName?: string;
   pendingClassName?: string;
 };

 const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
   ({ className, activeClassName, pendingClassName, href, to, ...props }, ref) => {
     const pathname = usePathname();
     const resolvedHref = href ?? to ?? "#";
     const hrefString = typeof resolvedHref === "string" ? resolvedHref : "";
     const isActive = hrefString !== "" && pathname === hrefString;

     return (
       <Link
         ref={ref}
         href={resolvedHref}
         className={cn(className, isActive && activeClassName, pendingClassName)}
         {...props}
       />
     );
   }
 );

 NavLink.displayName = "NavLink";

 export { NavLink };
