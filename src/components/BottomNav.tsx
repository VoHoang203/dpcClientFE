 "use client";

 import { Home, Users, MessageSquare, Bell, User } from "lucide-react";
 import Link from "next/link";
 import { usePathname } from "next/navigation";
 import { cn } from "@/lib/utils";

 interface NavItem {
   icon: React.ReactNode;
   label: string;
   href: string;
 }

 const navItems: NavItem[] = [
   { icon: <Home className="h-5 w-5" />, label: "Trang chủ", href: "/" },
   { icon: <Users className="h-5 w-5" />, label: "Chi bộ", href: "/documents" },
   { icon: <MessageSquare className="h-5 w-5" />, label: "Tin nhắn", href: "/ai-chat" },
   { icon: <Bell className="h-5 w-5" />, label: "Thông báo", href: "/notifications" },
   { icon: <User className="h-5 w-5" />, label: "Tài khoản", href: "/profile" },
 ];

 const BottomNav = () => {
   const pathname = usePathname();

   return (
     <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg md:hidden">
       <div className="flex h-16 items-center justify-around px-2">
         {navItems.map((item, index) => {
           const isActive = pathname === item.href;

           return (
             <Link
               key={index}
               href={item.href}
               className={cn(
                 "flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                 isActive
                   ? "text-primary"
                   : "text-muted-foreground hover:text-foreground"
               )}
             >
               <div
                 className={cn(
                   "rounded-lg p-1 transition-colors",
                   isActive && "bg-accent"
                 )}
               >
                 {item.icon}
               </div>
               <span
                 className={cn(
                   "text-[10px] font-medium",
                   isActive && "text-primary"
                 )}
               >
                 {item.label}
               </span>
             </Link>
           );
         })}
       </div>
       <div className="h-safe-area-inset-bottom bg-card" />
     </nav>
   );
 };

 export default BottomNav;
