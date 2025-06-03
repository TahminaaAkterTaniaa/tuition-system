'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaFile, FaFilePdf, FaTimes } from 'react-icons/fa';

interface DocumentPreviewProps {
  fileName?: string;
  fileUrl: string;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export default function DocumentPreview({ 
  fileName, 
  fileUrl, 
  onRemove,
  showRemoveButton = true 
}: DocumentPreviewProps) {
  const [previewError, setPreviewError] = useState(false);
  
  // Determine document type based on file extension or URL
  const getDocumentType = () => {
    // First check the URL for type indicators
    if (fileUrl.includes('.jpg') || fileUrl.includes('.jpeg') || fileUrl.includes('.png') || fileUrl.includes('.gif')) {
      return 'image';
    } else if (fileUrl.includes('.pdf')) {
      return 'pdf';
    }
    
    // If URL doesn't contain extension, check the fileName if available
    if (fileName) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
          return 'image';
        case 'pdf':
          return 'pdf';
        default:
          return 'unknown';
      }
    }
    
    return 'unknown';
  };
  
  const documentType = getDocumentType();
  
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };
  
  return (
    <div className="relative bg-white border rounded-lg overflow-hidden shadow-sm">
      {/* Preview Area */}
      <div className="h-48 flex items-center justify-center bg-gray-50 border-b">
        {documentType === 'image' && !previewError ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={fileUrl}
              alt={fileName || 'Document preview'}
              className="max-h-full max-w-full object-contain"
              onError={() => setPreviewError(true)}
            />
          </div>
        ) : documentType === 'pdf' ? (
          <div className="flex flex-col items-center">
            <FaFilePdf className="text-red-500 text-4xl mb-2" />
            <span className="text-sm text-gray-600 truncate max-w-[150px]">
              {fileName || 'PDF Document'}
            </span>
            <a 
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              View PDF
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FaFile className="text-gray-400 text-4xl mb-2" />
            <span className="text-sm text-gray-600 truncate max-w-[150px]">
              {fileName || 'Document'}
            </span>
          </div>
        )}
      </div>
      
      {/* Filename and Remove Button */}
      <div className="p-2 flex items-center justify-between bg-gray-50">
        <div className="truncate max-w-[180px] text-sm">
          {fileName || 'Document'}
        </div>
        {showRemoveButton && onRemove && (
          <button 
            onClick={onRemove}
            className="p-1 text-red-500 hover:text-red-700 transition-colors"
            aria-label="Remove document"
          >
            <FaTimes />
          </button>
        )}
      </div>
    </div>
  );
}
