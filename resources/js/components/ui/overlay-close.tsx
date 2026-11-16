import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/* The 44px round close of every sheet and dialog. Rooms tint it through --overlay-close-*. */
function OverlayClose({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      data-slot="overlay-close"
      aria-label="Close"
      className={cn("shell-close shell-press shell-focus", className)}
      {...props}
    >
      <XIcon className="size-5" strokeWidth={1.5} aria-hidden="true" />
    </DialogPrimitive.Close>
  )
}

export { OverlayClose }
