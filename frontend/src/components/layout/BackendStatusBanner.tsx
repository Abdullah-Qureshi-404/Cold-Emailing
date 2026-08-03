import React from 'react';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { BASE_URL } from '../../services/api/client';

export const BackendStatusBanner: React.FC = () => {
  const { isError, isLoading, isSuccess } = useBackendHealth();

  if (isLoading || isSuccess) return null;

  if (!isError) return null;

  return (
    <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-center text-xs text-red-300 font-mono">
      Unable to reach FastAPI backend at {BASE_URL}. Start the server with{' '}
      <span className="text-red-200 font-semibold">python run_dev.py</span> in the backend folder.
    </div>
  );
};
