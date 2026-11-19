import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/*
 * Page-number links. Pass an Inertia Link through `render`: a plain <a> reloads the document
 * and the back chevron forgets where you came from.
 */
function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Pages"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("m-0 flex list-none flex-wrap items-center gap-1 p-0", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  render: React.ReactElement<Record<string, unknown>>
  className?: string
  children?: React.ReactNode
  "aria-label"?: string
}

function PaginationLink({
  className,
  isActive,
  render,
  children,
  ...props
}: PaginationLinkProps) {
  return React.cloneElement(render, {
    "aria-current": isActive ? "page" : undefined,
    "data-slot": "pagination-link",
    "data-active": isActive ? "" : undefined,
    className: cn(
      buttonVariants({ variant: isActive ? "default" : "ghost", size: "icon" }),
      "shell-press min-w-11 w-auto px-3",
      className
    ),
    ...props,
    children,
  })
}

function PaginationPrevious({
  children = "Previous",
  ...props
}: PaginationLinkProps) {
  return (
    <PaginationLink {...props}>
      <ChevronLeftIcon strokeWidth={1.5} aria-hidden="true" />
      <span>{children}</span>
    </PaginationLink>
  )
}

function PaginationNext({ children = "Next", ...props }: PaginationLinkProps) {
  return (
    <PaginationLink {...props}>
      <span>{children}</span>
      <ChevronRightIcon strokeWidth={1.5} aria-hidden="true" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn("flex size-11 items-center justify-center", className)}
      {...props}
    >
      …
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
