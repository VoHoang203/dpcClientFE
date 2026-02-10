"use client"

import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-green-500 group-[.toaster]:!bg-green-50 dark:group-[.toaster]:!bg-green-950/30",
          error:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-destructive group-[.toaster]:!bg-red-50 dark:group-[.toaster]:!bg-red-950/30",
          warning:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-secondary group-[.toaster]:!bg-amber-50 dark:group-[.toaster]:!bg-amber-950/30",
          info:
            "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-blue-500 group-[.toaster]:!bg-blue-50 dark:group-[.toaster]:!bg-blue-950/30",
        },
      }}
      icons={{
        success: <CheckCircle className="h-5 w-5 text-green-600" />,
        error: <XCircle className="h-5 w-5 text-destructive" />,
        warning: <AlertTriangle className="h-5 w-5 text-secondary" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

