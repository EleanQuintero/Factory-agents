"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { AuraNode } from "@/components/aura/aura-node";

export type AuraNodeData = {
  icon: React.ReactNode;
  label: string;
  sub?: string;
};

type OrchestratorNode = Node<AuraNodeData, "orchestrator">;
type SubAgentNode = Node<AuraNodeData, "subAgent">;
type IoNode = Node<AuraNodeData, "io">;

export function OrchestratorNodeView({ data }: NodeProps<OrchestratorNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Left} id="back" />
      <AuraNode
        size="lg"
        inverted
        icon={data.icon}
        label={data.label}
        sub={data.sub}
      />
    </>
  );
}

export function SubAgentNodeView({ data }: NodeProps<SubAgentNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <AuraNode
        size="md"
        icon={data.icon}
        label={data.label}
        sub={data.sub}
      />
    </>
  );
}

export function IoNodeView({ data }: NodeProps<IoNode>) {
  return (
    <>
      <Handle type="target" position={Position.Right} />
      <Handle type="source" position={Position.Right} />
      <AuraNode
        size="sm"
        icon={data.icon}
        label={data.label}
        sub={data.sub}
      />
    </>
  );
}

export const nodeTypes = {
  orchestrator: OrchestratorNodeView,
  subAgent: SubAgentNodeView,
  io: IoNodeView,
};
