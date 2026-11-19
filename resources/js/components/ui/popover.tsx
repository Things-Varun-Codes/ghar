import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import * as React from "react"

import { useAppAttrs } from "@/hooks/use-app-attrs"
import { cn } from "@/lib/utils"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

/* The menu-and-popup motion: a fade and a slight grow from the trigger. */
const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale] duration-(--dur-in) ease-(--ease-ui) data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-(--dur-out) data-starting-style:scale-95 data-starting-style:opacity-0"

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  collisionPadding,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
  >) {
  const appAttrs = useAppAttrs()

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="isolate z-(--z-overlay)"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          data-scroll-container=""
          className={cn(
            "bg-popover text-popover-foreground w-72 rounded-md border p-4 shadow-md outline-hidden",
            popupMotion,
            className as string
          )}
          {...appAttrs}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("font-medium", className as string)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-muted-foreground", className as string)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  popupMotion,
}

export type PopoverContentProps = React.ComponentProps<typeof PopoverContent>
