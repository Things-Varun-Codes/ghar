import { ChevronDownIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

/* The platform's own picker, in the field look: for short lists inside sheets and on phones. */
function NativeSelect({
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn(
        "relative w-fit has-[select:disabled]:opacity-50",
        wrapperClassName
      )}
    >
      <select
        data-slot="native-select"
        className={cn(
          "shell-field h-11 w-full min-w-0 appearance-none rounded-(--radius-field) border border-(--shell-border-input) bg-(--card) py-1 pr-9 pl-3.5 text-base outline-none disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        data-slot="native-select-icon"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-(--shell-text-muted)"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

export { NativeSelect, NativeSelectOption }
