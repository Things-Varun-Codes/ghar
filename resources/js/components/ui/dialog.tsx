import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import * as React from "react"

import { OverlayClose } from "@/components/ui/overlay-close"
import { useAppAttrs } from "@/hooks/use-app-attrs"
import { cn } from "@/lib/utils"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "shell-scrim fixed inset-0 z-(--z-overlay) transition-opacity duration-(--dur-card) ease-(--ease-ui) data-ending-style:opacity-0 data-ending-style:duration-(--dur-out) data-starting-style:opacity-0",
        className as string
      )}
      {...props}
    />
  )
}

/*
 * Centred, rising 8px as it fades in. On a phone a focused field moves the dialog to the top,
 * since the on-screen keyboard covers the lower half and does not shrink the layout viewport.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  /* Off when the dialog places its own OverlayClose. */
  showCloseButton?: boolean
}) {
  const appAttrs = useAppAttrs()

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-scroll-container=""
        className={cn(
          "bg-background fixed top-[50%] left-[50%] z-(--z-overlay) grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 outline-none sm:max-w-lg",
          "transition-[opacity,translate] duration-(--dur-card) ease-(--ease-ui) data-ending-style:opacity-0 data-ending-style:duration-(--dur-out) data-starting-style:translate-y-[calc(-50%+8px)] data-starting-style:opacity-0",
          "max-md:has-[:is(input,textarea):focus]:top-[max(12px,env(safe-area-inset-top))] max-md:has-[:is(input,textarea):focus]:translate-y-0",
          className as string
        )}
        {...appAttrs}
        {...props}
      >
        {children}
        {showCloseButton && <OverlayClose />}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-medium", className as string)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className as string)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
