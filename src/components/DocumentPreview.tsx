'use client';

import { useState } from 'react';
import Image from 'next/image';

interface DocumentPreviewProps {
  documentType: 'idDocument' | 'transcript';
  fileName: string;
  onRemove?: () => void;
  showRemove?: boolean;
}

export default function DocumentPreview({ 
  documentType, 
  fileName, 
  onRemove,
  showRemove = true 
}: DocumentPreviewProps) {
  const [previewError, setPreviewError] = useState(false);
  
  // Get file extension
  const fileExt = fileName.split('.').pop()?.toLowerCase();
  const isPdf = fileExt === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png'].includes(fileExt || '');
  
  // Create file URL - files are served from the public/uploads directory
  const fileUrl = `/uploads/${fileName}`;
  
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };
  
  const documentTypeLabel = documentType === 'idDocument' 
    ? 'ID Document'
    : 'Academic Transcript';

  return (
    <div className="border rounded-md p-4 bg-gray-50 relative">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        {documentTypeLabel}
      </h3>
      
      {showRemove && onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          aria-label={`Remove ${documentTypeLabel}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      
      <div className="mt-2">
        {isPdf ? (
          <div className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              <path d="M3 8a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <div>
              <p className="text-sm text-gray-600 truncate max-w-xs">{fileName}</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View PDF
              </a>
            </div>
          </div>
        ) : isImage ? (
          previewError ? (
            <div className="flex flex-col items-center justify-center h-32 bg-gray-100 rounded">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-gray-500 mt-2">Unable to preview image</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                View original
              </a>
            </div>
          ) : (
            <div className="relative h-32 w-full">
              <Image
                src={fileUrl}
                alt={documentTypeLabel}
                fill
                className="object-contain rounded"
                onError={() => setPreviewError(true)}
              />
            </div>
          )
        ) : (
          <div className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-gray-600 truncate max-w-xs">{fileName}</p>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Download file
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
