import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Falls back to its initials while the picture loads and when it fails (a signed URL that
 * expired on a page restored from history). The shell's PersonAvatar is the one to use.
 */
function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative inline-flex size-8 shrink-0 overflow-hidden rounded-full select-none",
        className as string
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      loading="lazy"
      decoding="async"
      className={cn(
        "aspect-square size-full object-cover transition-opacity duration-(--dur-in) ease-(--ease-ui) data-starting-style:opacity-0",
        className as string
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full",
        className as string
      )}
      {...props}
    />
  )
}

/* Overlapping faces, each ringed in the surface colour. */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "flex -space-x-1.5 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-(--shell-surface)",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback, AvatarGroup, AvatarImage }
