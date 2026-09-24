import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { default: "bg-foreground text-background hover:opacity-80", outline: "border border-border bg-background hover:bg-surface", ghost: "hover:bg-surface", link: "underline underline-offset-4" }, size: { default: "h-10 px-5 py-2", sm: "h-9 px-3", lg: "h-12 px-7", icon: "size-10" } },
  defaultVariants: { variant: "default", size: "default" },
});

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { Button, buttonVariants };
