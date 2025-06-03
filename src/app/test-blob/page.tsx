'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function TestBlobPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', 'test');

      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResult(data);
        toast.success('File uploaded successfully!');
      } else {
        throw new Error(data.error || 'Failed to upload file');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Unknown upload error');
      toast.error('Upload failed. Check console for details.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Vercel Blob Storage Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload a File</h2>
        
        <div className="mb-4">
          <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
            Select File (images, PDFs)
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            aria-label="Select a file to upload"
          />
        </div>
        
        {file && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-medium">Selected file:</p>
            <p className="text-sm truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • {file.type}</p>
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`px-4 py-2 rounded-md ${
            !file || uploading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload to Vercel Blob'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700 font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {uploadResult && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Upload Successful!</h3>
          
          <div className="bg-white p-4 rounded shadow-sm overflow-auto">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(uploadResult, null, 2)}
            </pre>
          </div>
          
          {uploadResult.url && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">File preview:</p>
              {uploadResult.url.match(/\.(jpg|jpeg|png)$/i) ? (
                <div className="mt-2 border border-gray-200 rounded overflow-hidden max-w-md">
                  <img 
                    src={uploadResult.url} 
                    alt="Uploaded file" 
                    className="max-w-full h-auto"
                  />
                </div>
              ) : uploadResult.url.match(/\.pdf$/i) ? (
                <div className="mt-2">
                  <a 
                    href={uploadResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline inline-flex items-center"
                  >
                    View PDF
                  </a>
                </div>
              ) : (
                <a 
                  href={uploadResult.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  View uploaded file
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
