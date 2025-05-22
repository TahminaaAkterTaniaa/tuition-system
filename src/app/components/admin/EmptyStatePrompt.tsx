'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStatePromptProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
}

const EmptyStatePrompt: React.FC<EmptyStatePromptProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <div className="text-center py-10 px-6 bg-gray-50 rounded-lg border border-gray-200">
      {icon && (
        <div className="mx-auto w-16 h-16 flex items-center justify-center bg-indigo-100 rounded-full mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6">{description}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default EmptyStatePrompt;
