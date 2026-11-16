import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

// Two tones only: neutral for plain status, an accent wash for what stands out.
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[color-mix(in_oklab,var(--shell-accent)_35%,var(--shell-surface))] text-(--shell-accent-fg)",
        secondary:
          "border-transparent bg-(--shell-hover) text-(--shell-text)",
        destructive:
          "border-[color-mix(in_oklab,var(--shell-destructive)_45%,transparent)] bg-transparent text-(--shell-destructive)",
        outline: "border-(--shell-border) bg-transparent text-(--shell-text-muted)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
