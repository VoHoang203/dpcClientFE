 "use client";

 import { ChevronDown, User, LogOut, Briefcase } from "lucide-react";
 import Link from "next/link";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { Button } from "@/components/ui/button";
 import NotificationDropdown from "@/components/NotificationDropdown";

 const Header = () => {
   return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 shadow-sm backdrop-blur-md rounded-b-xl">
       <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-bold text-primary">
            FPTU DPC2
          </Link>
        </div>

         <div className="flex items-center gap-2">
           <NotificationDropdown />

           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="flex items-center gap-2 p-1.5">
                 <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                   <AvatarImage src="" />
                   <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                     ĐV
                   </AvatarFallback>
                 </Avatar>
                 <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-56">
               <div className="border-b border-border px-3 py-2">
                 <p className="font-medium text-foreground">Nguyễn Văn A</p>
                 <p className="text-sm text-muted-foreground">Đảng viên</p>
               </div>
               <DropdownMenuItem className="cursor-pointer gap-2" asChild>
                 <Link href="/profile">
                   <User className="h-4 w-4" />
                   Thông tin cá nhân
                 </Link>
               </DropdownMenuItem>
               <DropdownMenuItem className="cursor-pointer gap-2" asChild>
                 <Link href="/workspace">
                   <Briefcase className="h-4 w-4" />
                   Khu vực làm việc
                 </Link>
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem
                 className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                 asChild
               >
                 <Link href="/login">
                   <LogOut className="h-4 w-4" />
                   Đăng xuất
                 </Link>
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
     </header>
   );
 };

 export default Header;
