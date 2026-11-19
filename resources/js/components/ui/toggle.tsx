import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/* Pressed state is `data-pressed`; rooms restyle it with their own class. */
const toggleVariants = cva(
  "shell-focus inline-flex items-center justify-center gap-2 rounded-(--radius-pill) text-sm font-medium transition-colors duration-(--dur-out) ease-(--ease-ui) hover:bg-(--shell-hover) disabled:pointer-events-none disabled:opacity-50 data-pressed:bg-accent data-pressed:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent",
      },
      size: {
        default: "h-11 px-3 min-w-11",
        sm: "h-9 px-2.5 min-w-9",
        lg: "h-12 px-4 min-w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className as string)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
