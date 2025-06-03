'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import DocumentPreview from './DocumentPreview';

interface TimelineItem {
  title: string;
  time: string;
  content: React.ReactNode;
  status: 'completed' | 'pending' | 'error';
  icon?: React.ReactNode;
}

interface TimelineViewProps {
  enrollmentData: any;
}

export default function TimelineView({ enrollmentData }: TimelineViewProps) {
  const [expandedDocuments, setExpandedDocuments] = useState(false);
  
  // Parse the notes field if it's JSON
  const parseNotes = () => {
    if (!enrollmentData.notes) return null;
    
    try {
      const parsed = JSON.parse(enrollmentData.notes);
      console.log('Parsed enrollment notes:', parsed);
      return parsed;
    } catch (e) {
      // If not valid JSON, return as is
      console.log('Failed to parse notes as JSON:', e);
      return enrollmentData.notes;
    }
  };
  
  const parsedNotes = parseNotes();
  
  // Extract document paths from parsed notes or documents field
  const getDocumentPaths = () => {
    if (!parsedNotes) return null;
    
    // Check if parsedNotes has documents object
    if (typeof parsedNotes === 'object') {
      if (parsedNotes.documents) {
        return parsedNotes.documents; // If documents is directly in the parsed notes
      } else if (parsedNotes.idDocumentPath || parsedNotes.transcriptPath) {
        return parsedNotes; // If document paths are directly in the parsed notes
      } else {
        // Log all available keys for debugging
        console.log('Available keys in parsedNotes:', Object.keys(parsedNotes));
        return null;
      }
    }
    
    return null;
  };
  
  const documentPaths = getDocumentPaths();
  
  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Extract student details
  const studentName = enrollmentData.student?.user?.name || 'Student';
  const studentEmail = enrollmentData.student?.user?.email || '';
  const studentPhone = parsedNotes?.phone || '';
  const studentId = parsedNotes?.idNumber || '';
  
  // Build timeline items
  const timelineItems: TimelineItem[] = [
    {
      title: 'Application Submitted',
      time: formatDate(enrollmentData.requestDate),
      content: (
        <div className="space-y-2">
          <div className="flex flex-col space-y-1">
            <span className="font-medium">Student: {studentName}</span>
            <span className="text-sm text-gray-600">Email: {studentEmail}</span>
            {studentPhone && <span className="text-sm text-gray-600">Phone: {studentPhone}</span>}
            {studentId && <span className="text-sm text-gray-600">Student ID: {studentId}</span>}
          </div>
        </div>
      ),
      status: 'completed',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];
  
  // Always add Documents Uploaded item
  {
    timelineItems.push({
      title: 'Documents Uploaded',
      time: formatDate(enrollmentData.requestDate),
      content: (
        <div>
          <div className="space-y-2">
            {documentPaths ? (
              <>
                <div className="mb-2">
                  {!expandedDocuments ? (
                    <button 
                      onClick={() => setExpandedDocuments(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Show Documents
                    </button>
                  ) : (
                    <button 
                      onClick={() => setExpandedDocuments(false)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Hide Documents
                    </button>
                  )}
                </div>
                
                {expandedDocuments && (
                  <div className="mt-2">
                    {/* If we have document paths directly */}
                    {documentPaths && (
                      <DocumentPreview jsonData={JSON.stringify({
                        idDocumentPath: documentPaths.idDocumentPath || 
                          (documentPaths.documents && documentPaths.documents.idDocumentPath),
                        transcriptPath: documentPaths.transcriptPath || 
                          (documentPaths.documents && documentPaths.documents.transcriptPath)
                      })} />
                    )}
                  </div>
                )}
                
                {/* Document list */}
                <ul className="mt-2 space-y-2">
                  {(documentPaths.idDocumentPath || (documentPaths.documents && documentPaths.documents.idDocumentPath)) && (
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">ID Document</span>
                      <button 
                        onClick={() => setExpandedDocuments(true)}
                        className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Preview
                      </button>
                    </li>
                  )}
                  {(documentPaths.transcriptPath || (documentPaths.documents && documentPaths.documents.transcriptPath)) && (
                    <li className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Transcript</span>
                      <button 
                        onClick={() => setExpandedDocuments(true)}
                        className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Preview
                      </button>
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No documents uploaded
              </div>
            )}
          </div>
        </div>
      ),
      status: 'completed',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    });
  }
  
  // Add Payment Initiated item if payment info exists
  if (parsedNotes && parsedNotes.paymentMethod) {
    timelineItems.push({
      title: 'Payment Initiated',
      time: parsedNotes.paymentDate ? formatDate(parsedNotes.paymentDate) : formatDate(enrollmentData.requestDate),
      content: (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Amount:</span>
            <span className="text-sm">${parsedNotes.amount || enrollmentData.class?.fee || '0.00'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Method:</span>
            <span className="text-sm">{parsedNotes.paymentMethod || 'Credit Card'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              PENDING
            </span>
          </div>
        </div>
      ),
      status: 'pending',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    });
  }

  return (
    <div className="flow-root">
      <div className="border border-gray-200 rounded-lg bg-white p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Application Progress</h3>
        
        <ul className="-mb-8">
          {timelineItems.map((item, index) => (
            <li key={index}>
              <div className="relative pb-8">
                {index < timelineItems.length - 1 && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        item.status === 'completed' 
                          ? 'bg-green-500' 
                          : item.status === 'pending' 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                      }`}
                    >
                      {item.icon || (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <div className="mt-2">{item.content}</div>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      <time dateTime={item.time}>{item.time}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
