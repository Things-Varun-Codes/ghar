import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/*
 * A field with things inside its frame: a search icon, a clear or show-password button. The
 * frame takes the field look; the inner control drops its own border.
 */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-11 w-full min-w-0 items-center rounded-(--radius-field) border border-(--shell-border-input) bg-(--card) transition-[border-color,box-shadow] duration-(--dur-out) ease-(--ease-ui) has-[[data-slot=input-group-control]:focus-visible]:border-(--shell-action) has-[[data-slot=input-group-control]:focus-visible]:shadow-(--shell-field-focus) has-[[aria-invalid=true]]:border-(--shell-destructive)",
        className
      )}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end"
}) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex h-full shrink-0 items-center justify-center gap-2 text-(--shell-text-muted) data-[align=inline-end]:order-last data-[align=inline-end]:pr-1 data-[align=inline-start]:order-first data-[align=inline-start]:pl-3 [&>svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

/* 44px square, as every control is. */
function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type"> & {
  type?: "button" | "submit" | "reset"
}) {
  return (
    <Button
      type={type}
      variant={variant}
      size="icon"
      className={cn("shell-focus size-10 rounded-full", className as string)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-(length:--text-small) text-(--shell-text-muted) [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        "placeholder:text-muted-foreground h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
}
