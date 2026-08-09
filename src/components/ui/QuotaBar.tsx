import React from 'react';

interface QuotaBarProps {
  used: number;
  limit: number;
  resetAt?: string;
}

export function QuotaBar({ used, limit, resetAt }: QuotaBarProps) {
  const percent = Math.min(Math.round((used / limit) * 100) || 0, 100);
  
  let colorClass = 'bg-success';
  if (percent >= 80) {
    colorClass = 'bg-error';
  } else if (percent >= 60) {
    colorClass = 'bg-warning';
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm font-medium text-text">
        <span>{used} / {limit} API calls</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-surface/50">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${colorClass}`} 
          style={{ width: `${percent}%` }}
        />
      </div>
      {resetAt && (
        <div className="text-xs text-muted text-right">
          Resets: {new Date(resetAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
