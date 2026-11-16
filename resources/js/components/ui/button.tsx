import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "shell-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "shell-btn-primary bg-primary text-primary-foreground",
        destructive:
          "shell-btn-destructive bg-destructive text-destructive-foreground",
        outline:
          "shell-btn-outline border border-input bg-card text-foreground",
        secondary:
          "shell-btn-outline border border-input bg-card text-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "shell-link text-foreground underline underline-offset-4",
      },
      size: {
        default: "h-11 px-6 has-[>svg]:px-5",
        sm: "h-9 px-4 text-sm has-[>svg]:px-3",
        lg: "h-12 px-7 has-[>svg]:px-6",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
