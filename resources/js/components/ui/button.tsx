import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "shell-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-medium disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none aria-invalid:border-destructive",
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

/*
 * A link drawn as a button is `<Link className={buttonVariants()}>`, not this: Base UI's Button
 * gives whatever it renders role="button".
 */
function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className as string)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
