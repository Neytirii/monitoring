import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NetworkNode from './NetworkNode';
import api from '../../lib/api';

const nodeTypes = { networkNode: NetworkNode };

interface NetworkMapProps {
  mapId: string;
}

export default function NetworkMap({ mapId }: NetworkMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/network-maps/${mapId}`);
        const flowNodes: Node[] = (data.networkMap.nodes ?? []).map(
          (n: {
            id: string;
            label: string;
            type: string;
            positionX: number;
            positionY: number;
            host?: { status: string };
          }) => ({
            id: n.id,
            type: 'networkNode',
            position: { x: n.positionX, y: n.positionY },
            data: {
              label: n.label,
              nodeType: n.type,
              status: n.host?.status ?? 'UNKNOWN',
            },
          }),
        );

        const flowEdges: Edge[] = (data.networkMap.edges ?? []).map(
          (e: { id: string; sourceId: string; targetId: string; label?: string }) => ({
            id: e.id,
            source: e.sourceId,
            target: e.targetId,
            label: e.label,
          }),
        );

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error('Failed to load network map', err);
      } finally {
        setLoading(false);
      }
    };

    if (mapId !== 'default') {
      load();
    } else {
      setLoading(false);
    }
  }, [mapId, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
