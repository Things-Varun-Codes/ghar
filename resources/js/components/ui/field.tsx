import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/*
 * The parts of a form field. The shell's FormField composes them and wires the ids; use the
 * parts directly for a group of checkboxes or radios (FieldSet + FieldLegend).
 */
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("m-0 flex min-w-0 flex-col gap-3 border-0 p-0", className)}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  ...props
}: React.ComponentProps<"legend">) {
  return (
    <legend
      data-slot="field-legend"
      className={cn("mb-1.5 p-0 text-[14px] font-medium text-(--foreground)", className)}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex w-full flex-col gap-5", className)}
      {...props}
    />
  )
}

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal"
}) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "group/field flex w-full data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:items-center data-[orientation=horizontal]:gap-3 data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1 leading-snug", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn("mb-1.5 block", className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "m-0 text-(length:--text-small) leading-normal font-normal text-(--muted-foreground)",
        className
      )}
      {...props}
    />
  )
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  if (!props.children) {
    return null
  }

  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn(
        "m-0 text-(length:--text-small) font-normal text-(--destructive)",
        className
      )}
      {...props}
    />
  )
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
}
