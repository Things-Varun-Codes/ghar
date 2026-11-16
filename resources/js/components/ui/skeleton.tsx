import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shell-skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
