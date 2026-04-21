"use client";

import { ReactFlow, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ChevronRight, ChevronLeft, Search, Target } from "lucide-react";
import { nodeTypes, type AuraNodeData } from "./custom-nodes";

const initialNodes: Node<AuraNodeData>[] = [
  {
    id: "prompt",
    type: "io",
    position: { x: 0, y: 180 },
    data: { icon: <ChevronRight />, label: "PROMPT", sub: "INPUT" },
  },
  {
    id: "response",
    type: "io",
    position: { x: 0, y: 420 },
    data: { icon: <ChevronLeft />, label: "RESPONSE", sub: "OUTPUT" },
  },
  {
    id: "sensei",
    type: "orchestrator",
    position: { x: 220, y: 220 },
    data: { icon: <Target />, label: "SENSEI", sub: "ORCHESTRATOR" },
  },
  {
    id: "websearch",
    type: "subAgent",
    position: { x: 540, y: 60 },
    data: { icon: <Search />, label: "WEB SEARCH", sub: "SUB-AGENT" },
  },
  {
    id: "notion",
    type: "subAgent",
    position: { x: 620, y: 280 },
    data: {
      icon: <span className="text-2xl font-bold">N</span>,
      label: "NOTION",
      sub: "SUB-AGENT",
    },
  },
  {
    id: "resend",
    type: "subAgent",
    position: { x: 540, y: 500 },
    data: {
      icon: <span className="text-2xl font-bold">R</span>,
      label: "RESEND",
      sub: "SUB-AGENT",
    },
  },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "prompt", target: "sensei", type: "straight" },
  { id: "e2", source: "sensei", target: "websearch", type: "straight" },
  { id: "e3", source: "sensei", target: "notion", type: "straight" },
  { id: "e4", source: "sensei", target: "resend", type: "straight" },
  {
    id: "e5",
    source: "sensei",
    target: "response",
    sourceHandle: "back",
    type: "straight",
  },
];

export function NodeGraph() {
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      />
    </div>
  );
}
