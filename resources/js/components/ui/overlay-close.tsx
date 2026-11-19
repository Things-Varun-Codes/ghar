import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/*
 * The 44px round close of every sheet and dialog. Rooms tint it through --overlay-close-*. A
 * Drawer is a Dialog underneath, so this closes either.
 */
function OverlayClose({
  className,
  ...props
}: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="overlay-close"
      aria-label="Close"
      className={cn("shell-close shell-press shell-focus", className as string)}
      {...props}
    >
      <XIcon className="size-5" strokeWidth={1.5} aria-hidden="true" />
    </DialogPrimitive.Close>
  )
}

export { OverlayClose }
