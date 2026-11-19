import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import * as React from "react"

import { useAppAttrs } from "@/hooks/use-app-attrs"
import { cn } from "@/lib/utils"

/*
 * A sheet that follows the finger: from the bottom on a phone (swipe down to close) or from the
 * right on a wide screen (swipe right). `keyboardAware` wraps it in Base UI's
 * VirtualKeyboardProvider, which keeps the focused field in view above an on-screen keyboard and
 * sets --drawer-keyboard-inset for a footer to sit on.
 */
function Drawer({
  keyboardAware = false,
  children,
  ...props
}: DrawerPrimitive.Root.Props & { keyboardAware?: boolean }) {
  return (
    <DrawerPrimitive.Root data-slot="drawer" {...props}>
      {keyboardAware ? (
        <DrawerPrimitive.VirtualKeyboardProvider>
          {children as React.ReactNode}
        </DrawerPrimitive.VirtualKeyboardProvider>
      ) : (
        children
      )}
    </DrawerPrimitive.Root>
  )
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "shell-scrim fixed inset-0 z-(--z-overlay) min-h-dvh opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-(--dur-sheet) ease-(--ease-ui) data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--dur-sheet-out))] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute",
        className as string
      )}
      {...props}
    />
  )
}

/*
 * The popup is the moving frame; the caller sizes it (a height for a bottom sheet, a width for
 * a side panel). Children sit inside Drawer.Content, which keeps text selectable with a mouse.
 */
function DrawerContent({
  className,
  contentClassName,
  children,
  ...props
}: DrawerPrimitive.Popup.Props & { contentClassName?: string }) {
  const appAttrs = useAppAttrs()

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-(--z-overlay)"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          data-scroll-container=""
          className={cn(
            "bg-background fixed flex flex-col outline-none will-change-transform",
            "[transform:translate3d(var(--drawer-swipe-movement-x,0px),var(--drawer-swipe-movement-y,0px),0)] transition-transform duration-(--dur-sheet) ease-(--ease-ui) data-swiping:duration-0 data-swiping:select-none",
            "data-ending-style:[transform:var(--drawer-closed)] data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--dur-sheet-out))] data-starting-style:[transform:var(--drawer-closed)]",
            "data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:border-t data-[swipe-direction=down]:[--drawer-closed:translate3d(0,calc(100%+2px),0)]",
            "data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:border-l data-[swipe-direction=right]:[--drawer-closed:translate3d(calc(100%+2px),0,0)]",
            className as string
          )}
          {...appAttrs}
          {...props}
        >
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className={cn(
              "flex min-h-0 flex-1 flex-col rounded-[inherit]",
              contentClassName
            )}
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-medium", className as string)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className as string)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
}
