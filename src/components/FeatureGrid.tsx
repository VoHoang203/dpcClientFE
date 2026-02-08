 "use client";

 import Link from "next/link";
 import {
   Calendar,
   FileText,
   Users,
   BookOpen,
   ClipboardCheck,
   MessageSquare,
   Award,
   Shield,
 } from "lucide-react";

 interface FeatureItem {
   icon: React.ReactNode;
   label: string;
   description?: string;
   color: string;
   bgColor: string;
   href: string;
 }

 const features: FeatureItem[] = [
   {
     icon: <Calendar className="h-6 w-6" />,
     label: "Lịch họp",
     description: "Sự kiện & Cuộc họp",
     color: "text-primary",
     bgColor: "bg-accent",
     href: "/calendar",
   },
   {
     icon: <FileText className="h-6 w-6" />,
     label: "Tài liệu",
     description: "Thư viện & Policy",
     color: "text-blue-600",
     bgColor: "bg-blue-50",
     href: "/documents",
   },
   {
     icon: <Users className="h-6 w-6" />,
     label: "Điểm danh",
     description: "Báo cáo & Thống kê",
     color: "text-green-600",
     bgColor: "bg-green-50",
     href: "/attendance-report",
   },
   {
     icon: <BookOpen className="h-6 w-6" />,
     label: "Sổ tay Đảng viên",
     description: "Thông tin & Hướng dẫn",
     color: "text-amber-600",
     bgColor: "bg-amber-50",
     href: "/handbook",
   },
   {
     icon: <ClipboardCheck className="h-6 w-6" />,
     label: "Đảng phí",
     description: "Thông báo & Theo dõi",
     color: "text-purple-600",
     bgColor: "bg-purple-50",
     href: "/party-fees-history",
   },
   {
     icon: <MessageSquare className="h-6 w-6" />,
     label: "Trợ lý AI",
     description: "Hỗ trợ thông minh",
     color: "text-cyan-600",
     bgColor: "bg-cyan-50",
     href: "/ai-chat",
   },
   {
     icon: <Award className="h-6 w-6" />,
     label: "Xếp loại",
     description: "Đánh giá Đảng viên",
     color: "text-orange-600",
     bgColor: "bg-orange-50",
     href: "/classification",
   },
   {
     icon: <Shield className="h-6 w-6" />,
     label: "Kỷ luật",
     description: "Quản lý & Theo dõi",
     color: "text-rose-600",
     bgColor: "bg-rose-50",
     href: "/discipline",
   },
 ];

 const FeatureGrid = () => {
   return (
     <section className="px-4 py-6">
       <h2 className="mb-4 text-lg font-semibold text-foreground">
         Tiện ích Đảng viên
       </h2>
       <div className="grid grid-cols-4 gap-3 md:gap-4">
         {features.map((feature, index) => (
           <Link
             key={index}
             href={feature.href}
             className="group flex flex-col items-center gap-2 rounded-xl bg-card p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:scale-95"
           >
             <div
               className={`rounded-xl p-3 transition-transform duration-200 group-hover:scale-110 ${feature.bgColor} ${feature.color}`}
             >
               {feature.icon}
             </div>
             <span className="text-center text-xs font-medium leading-tight text-foreground">
               {feature.label}
             </span>
           </Link>
         ))}
       </div>
     </section>
   );
 };

 export default FeatureGrid;
