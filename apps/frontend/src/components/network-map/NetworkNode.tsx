import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Server, Router, Network } from 'lucide-react';
import { clsx } from 'clsx';

interface NetworkNodeData {
  label: string;
  nodeType: 'server' | 'router' | 'switch' | string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  [key: string]: unknown;
}

const statusColors: Record<string, string> = {
  ONLINE: 'bg-green-500',
  OFFLINE: 'bg-red-500',
  UNKNOWN: 'bg-gray-400',
};

const NodeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'router':
      return <Router className="w-6 h-6" />;
    case 'switch':
      return <Network className="w-6 h-6" />;
    default:
      return <Server className="w-6 h-6" />;
  }
};

function NetworkNodeComponent({ data }: NodeProps) {
  const nodeData = data as NetworkNodeData;

  return (
    <div
      className={clsx(
        'relative px-4 py-3 rounded-xl shadow-md border-2 bg-white dark:bg-gray-800',
        nodeData.status === 'ONLINE'
          ? 'border-green-400'
          : nodeData.status === 'OFFLINE'
            ? 'border-red-400'
            : 'border-gray-300',
      )}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="text-gray-600 dark:text-gray-300">
            <NodeIcon type={nodeData.nodeType} />
          </div>
          <span
            className={clsx(
              'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800',
              statusColors[nodeData.status] ?? 'bg-gray-400',
            )}
          />
        </div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate text-center">
          {nodeData.label}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(NetworkNodeComponent);
