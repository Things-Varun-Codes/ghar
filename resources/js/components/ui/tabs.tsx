import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

/*
 * Tabs that switch something on this page. Arrow keys move focus only; Enter or a click picks a
 * tab (List's activateOnFocus stays off), so a tab that loads from the server isn't fetched for
 * every key press. Tabs that are links to other pages are a nav, not this.
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className as string)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("relative inline-flex w-fit items-center", className as string)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "shell-focus relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className as string
      )}
      {...props}
    />
  )
}

/* The moving highlight under the selected tab, positioned by Base UI's --active-tab-* vars. */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) transition-[left,top,width,height] duration-(--dur-card) ease-(--ease-ui)",
        className as string
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("outline-none", className as string)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger }
