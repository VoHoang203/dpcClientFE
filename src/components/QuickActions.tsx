 "use client";

 import { ArrowRight, Sparkles } from "lucide-react";
 import { Badge } from "@/components/ui/badge";

 interface QuickAction {
   title: string;
   subtitle: string;
   isNew?: boolean;
   icon?: React.ReactNode;
 }

 const actions: QuickAction[] = [
   {
     title: "Cuộc họp Chi bộ tháng 1",
     subtitle: "28/01/2026 - 14:00",
     isNew: true,
   },
   {
     title: "Nộp đảng phí Q1/2026",
     subtitle: "Hạn: 15/02/2026",
   },
   {
     title: "Kiểm điểm cuối năm 2025",
     subtitle: "Đã nộp - Chờ duyệt",
   },
 ];

 const QuickActions = () => {
   return (
     <section className="px-4 py-2">
       <div className="mb-4 flex items-center justify-between">
         <h2 className="text-lg font-semibold text-foreground">
           Hoạt động gần đây
         </h2>
         <button className="flex items-center gap-1 text-sm font-medium text-primary transition-all hover:gap-2">
           Xem tất cả
           <ArrowRight className="h-4 w-4" />
         </button>
       </div>

       <div className="space-y-3">
         {actions.map((action, index) => (
           <div
             key={index}
             className="group flex cursor-pointer items-center gap-4 rounded-xl bg-card p-4 shadow-card transition-all duration-200 hover:shadow-soft"
           >
             <div className="min-w-0 flex-1">
               <div className="mb-0.5 flex items-center gap-2">
                 <h3 className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                   {action.title}
                 </h3>
                 {action.isNew && (
                   <Badge className="bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
                     Mới
                   </Badge>
                 )}
               </div>
               <p className="truncate text-sm text-muted-foreground">
                 {action.subtitle}
               </p>
             </div>
             <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
           </div>
         ))}
       </div>

       <div className="mt-4 rounded-xl bg-linear-to-r from-primary to-party-red-dark p-4 text-primary-foreground shadow-lg">
         <div className="flex items-start gap-3">
           <div className="rounded-lg bg-primary-foreground/20 p-2">
             <Sparkles className="h-5 w-5" />
           </div>
           <div className="flex-1">
             <h3 className="mb-1 font-semibold">Trợ lý AI Đảng viên</h3>
             <p className="mb-3 text-sm opacity-90">
               Hỏi đáp về quy định, thủ tục và hoạt động Đảng
             </p>
             <button className="rounded-lg bg-primary-foreground/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-foreground/30">
               Bắt đầu trò chuyện →
             </button>
           </div>
         </div>
       </div>
     </section>
   );
 };

 export default QuickActions;
