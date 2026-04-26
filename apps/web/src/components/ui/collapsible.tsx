"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"

export type CollapsibleProps = React.ComponentProps<typeof CollapsiblePrimitive.Root>
export type CollapsibleTriggerProps = React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>
export type CollapsibleContentProps = React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>

function Collapsible({ ...props }: CollapsibleProps) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ ...props }: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({ ...props }: CollapsibleContentProps) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
