import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { popupMotion } from "@/components/ui/popover"
import { useAppAttrs } from "@/hooks/use-app-attrs"
import { cn } from "@/lib/utils"

/*
 * A pointer extra: never the only place something is said, since touch and keyboard users may
 * not see it. TooltipProvider sits once at the app root.
 */
function TooltipProvider({
  delay = 400,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

/* Raised so a tooltip on a control inside a sheet draws over the sheet. */
function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  const appAttrs = useAppAttrs()

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-(--z-overlay-raised)"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "inline-flex w-fit max-w-xs items-center gap-1.5 rounded-(--radius-inner) bg-(--shell-text) px-3 py-1.5 text-[13px] text-(--shell-surface)",
            popupMotion,
            className as string
          )}
          {...appAttrs}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
