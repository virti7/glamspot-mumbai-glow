import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#EC4899] text-white",
        secondary: "bg-[#F3F4F6] text-[#6B7280]",
        destructive: "bg-[#FEF2F2] text-[#EF4444]",
        outline: "border border-[#E5E7EB] text-[#6B7280]",
        success: "bg-[#F0FDF4] text-[#16A34A]",
        warning: "bg-[#FFFBEB] text-[#D97706]",
        info: "bg-[#EFF6FF] text-[#2563EB]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
