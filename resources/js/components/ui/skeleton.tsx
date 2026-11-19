import * as React from "react"

import { cn } from "@/lib/utils"

/* .shell-skeleton carries the pulse and stops it under reduced motion. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("shell-skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
