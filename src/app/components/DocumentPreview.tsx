'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'react-hot-toast';

type DocumentPath = string;

type DocumentData = {
  [key: string]: DocumentPath | null | undefined;
};

interface DocumentPreviewProps {
  jsonData: string;
}

export default function DocumentPreview({ jsonData }: DocumentPreviewProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Parse JSON data safely
  interface EnrollmentData {
    fullName?: string;
    email?: string;
    phone?: string;
    idNumber?: string;
    emergencyContact?: string;
    additionalNotes?: string;
    idDocumentPath?: string;
    transcriptPath?: string;
    [key: string]: string | undefined;
  }

  const parseData = (): EnrollmentData => {
    try {
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return {};
    }
  };

  const data = parseData();

  // Check if a file is an image based on extension
  const isImageFile = (path: string | null | undefined): boolean => {
    if (!path) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => path.toLowerCase().endsWith(ext));
  };

  // Check if a file is a PDF based on extension
  const isPdfFile = (path: string | null | undefined): boolean => {
    if (!path) return false;
    return path.toLowerCase().endsWith('.pdf');
  };

  // Get filename from path
  const getFileName = (path: string | undefined): string => {
    if (!path) return 'Unknown file';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  // Get secure URL for documents
  const getSecureUrl = (path: string | null | undefined): string => {
    if (!path) return '/placeholder.png';
    // Remove any leading slashes and 'uploads/' from the path
    const cleanPath = path.replace(/^\/+|uploads\/+/g, '');
    return `/api/uploads/${cleanPath}`;
  };

  // Handle expanding/closing image preview
  const toggleImageExpand = (path: string | null) => {
    setExpandedImage(path);
  };

  // If parsing failed
  if (!data) {
    return null;
  }

  // Separate documents from other fields
  const documents = {
    idDocumentPath: data.idDocumentPath,
    transcriptPath: data.transcriptPath
  };

  // Get all fields except documents, status, and additionalNotes
  const regularFields = Object.entries(data).filter(([key]) => 
    !['idDocumentPath', 'transcriptPath', 'documents', 'status', 'additionalNotes', 'applicationSubmitted'].includes(key)
  );

  // Get additional notes separately
  const additionalNotes = data.additionalNotes;

  return (
    <div className="mt-2 space-y-4">
      {/* Regular Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {regularFields.map(([key, value]) => {
          if (!value) return null;
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          
          return (
            <div key={key} className="bg-gray-50 rounded p-3">
              <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{label}</div>
              <div className="text-sm text-gray-900 break-words">{value}</div>
            </div>
          );
        })}
      </div>

      {/* Additional Notes - Full Width */}
      {additionalNotes && (
        <div className="bg-gray-50 rounded p-3">
          <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Additional Notes</div>
          <div className="text-sm text-gray-900 break-words whitespace-pre-wrap">{additionalNotes}</div>
        </div>
      )}

      {/* Documents */}
      {(documents.idDocumentPath || documents.transcriptPath) && (
        <div className="bg-gray-50 rounded p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">Uploaded Documents</h3>
          <div className="space-y-2">
            {Object.entries(documents).map(([key, path]) => {
              if (!path) return null;
              
              const fileName = getFileName(path);
              const secureUrl = getSecureUrl(path);
              const documentType = key.replace(/Path$/, '').replace(/([A-Z])/g, ' $1').trim();
              
              return (
                <div key={key} className="flex items-center p-3 bg-white rounded hover:bg-gray-50 transition-colors">
                  {/* Document Type Icon */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded bg-gray-50">
                    {isImageFile(path) ? (
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : isPdfFile(path) ? (
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Document Info */}
                  <div className="ml-4 flex-grow">
                    <h4 className="text-sm font-medium text-gray-900">{documentType}</h4>
                    <p className="text-sm text-gray-500 mt-1">{fileName}</p>
                  </div>
                  
                  {/* Action Button */}
                  <div className="ml-4">
                    {isImageFile(path) ? (
                      <button
                        onClick={() => toggleImageExpand(getSecureUrl(path))}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </button>
                    ) : (
                      <a
                        href={secureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Image Preview Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => toggleImageExpand(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-2"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={expandedImage} 
              alt="Document preview" 
              className="max-w-full max-h-[80vh] object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.png';
                e.currentTarget.alt = 'Failed to load image';
                toast.error('Failed to load image preview');
              }}
            />
            <button 
              onClick={() => toggleImageExpand(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              title="Close preview"
              aria-label="Close preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
