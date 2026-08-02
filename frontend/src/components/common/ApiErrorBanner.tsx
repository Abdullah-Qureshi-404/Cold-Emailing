import React from 'react';
import { BASE_URL } from '../../services/api/client';

interface ApiErrorBannerProps {
  message?: string;
  className?: string;
}

export const ApiErrorBanner: React.FC<ApiErrorBannerProps> = ({
  message = `Failed to fetch data from FastAPI server at ${BASE_URL}.`,
  className = '',
}) => (
  <div
    className={`rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-400 font-mono text-center ${className}`}
  >
    {message}
  </div>
);
