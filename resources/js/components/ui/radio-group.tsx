import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

/*
 * Arrow keys move the choice and only the chosen radio is a tab stop. A room that draws its
 * choices as chips passes `render` to RadioGroupItem and styles `data-checked` itself.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-3", className as string)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "shell-focus peer relative flex aspect-square size-5 shrink-0 items-center justify-center rounded-full border border-(--shell-border-input) bg-(--card) outline-none before:absolute before:-inset-3 before:content-[''] data-checked:border-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive",
        className as string
      )}
      {...props}
    >
      {children ?? (
        <RadioPrimitive.Indicator
          data-slot="radio-group-indicator"
          className="size-2.5 rounded-full bg-primary"
        />
      )}
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
