"use client";
import { useEffect, useRef, useState } from "react";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { type GhostState } from "@/lib/ghost-state";
import { appNames, type AppId } from "@/lib/fixtures";
type ContextNodeData = { label: string; detail: string; app: AppId };
function ContextNode({ data }: NodeProps<Node<ContextNodeData>>) {
  return (
    <div className={`context-node ${data.app}`}>
      <Handle type="target" position={Position.Top} />
      <span>{data.detail}</span>
      <strong title={data.label}>{data.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { context: ContextNode };
export function ContextGraph({
  state,
  onSource,
}: {
  state: GhostState;
  onSource: (app: AppId) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ x: 10, y: 10, zoom: 0.85 });
  const graphHeight = Math.max(270, ...state.nodes.map((n) => n.y + 65));
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 18 || height <= 20) return;
      const zoom = Math.min(
        (width - 18) / 410,
        (height - 20) / graphHeight,
        1.1,
      );
      setViewport({
        x: (width - 410 * zoom) / 2,
        y: (height - graphHeight * zoom) / 2,
        zoom,
      });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [graphHeight]);
  return (
    <div
      className="graph-region"
      aria-label={`Context graph: ${state.nodes.length} entities, ${state.edges.length} relationships`}
    >
      <div className="graph-title">
        <span className="eyebrow">LIVE CONTEXT GRAPH</span>
        <span>
          {state.nodes.length} entities <i /> {state.edges.length} links
        </span>
      </div>
      <div className="graph-canvas" ref={container}>
        <ReactFlow
          nodes={state.nodes.map((n) => ({
            id: n.id,
            type: "context",
            position: { x: n.x, y: n.y },
            data: { label: n.label, detail: n.detail, app: n.app },
            ariaLabel: `${n.label}, source ${appNames[n.app]}`,
            style: { width: 118 },
          }))}
          edges={state.edges.map((e) => ({
            ...e,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#acbd90", strokeWidth: 1.2 },
            labelStyle: { fontSize: 7, fill: "#91a078" },
            labelBgStyle: { fill: "#f9faf6" },
            labelBgPadding: [3, 2] as [number, number],
          }))}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => onSource(node.data.app)}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          viewport={viewport}
          minZoom={0.1}
          maxZoom={1}
          proOptions={{ hideAttribution: false }}
        >
          <Background color="#dbe2d1" gap={17} size={1} />
        </ReactFlow>
      </div>
      <div className="graph-legend">
        {state.visited.map((app) => (
          <button key={app} onClick={() => onSource(app)}>
            <i className={app} />
            {appNames[app]}
          </button>
        ))}
        <span>Click a node to view its source</span>
      </div>
    </div>
  );
}
