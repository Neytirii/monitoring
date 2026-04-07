import { useParams } from 'react-router-dom';
import NetworkMap from '../components/network-map/NetworkMap';

export default function NetworkMapPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Network Map</h1>
      </div>
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ minHeight: '600px' }}>
        <NetworkMap mapId={id ?? 'default'} />
      </div>
    </div>
  );
}
