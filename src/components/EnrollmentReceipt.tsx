'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';

interface ReceiptProps {
  receiptNumber: string;
  transactionId: string;
  date: string;
  studentName: string;
  className: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

interface EnrollmentReceiptProps {
  enrollmentId: string;
  receipt: ReceiptProps;
}

export default function EnrollmentReceipt({ enrollmentId, receipt }: EnrollmentReceiptProps) {
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [studentProfile, setStudentProfile] = useState<{ idNumber?: string; fullName?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch student profile data to get accurate student ID
  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/student/profile');
        const data = await response.json();
        
        if (data.success && data.profile) {
          setStudentProfile(data.profile);
        }
      } catch (error) {
        console.error('Error fetching student profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudentProfile();
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 500);
  };

  const handleDownloadPDF = () => {
    if (!receipt) {
      console.error('Receipt content not available');
      return;
    }

    try {
      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.innerText = 'Generating PDF...';
      loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(loadingToast);

      // Create PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let yPos = 20;
      
      // ===== TOP HEADER SECTION =====
      // Add NexStack logo with a purple N box exactly matching UI
      doc.setFillColor(93, 63, 211); // NexStack purple
      doc.roundedRect(margin, yPos, 16, 16, 1, 1, 'F');
      
      // Add white N to logo
      doc.setTextColor(255, 255, 255); 
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('N', margin + 6, yPos + 10);
      
      // Left header section - institute name and location
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('NexStack Tuition', margin + 22, yPos + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Singapore', margin + 22, yPos + 14);
      doc.text('Singapore, 90588146', margin + 22, yPos + 20);
      
      // Right header: RECEIPT text and details
      const rightColumnX = pageWidth - margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RECEIPT', rightColumnX, yPos + 5, { align: 'right' });
      
      // Add horizontal line
      yPos += 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      
      // Receipt details on right
      yPos += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Receipt #${receipt.receiptNumber}`, rightColumnX, yPos, { align: 'right' });
      yPos += lineHeight;
      doc.text(`Receipt Date: ${new Date(receipt.date).toLocaleDateString()}`, rightColumnX, yPos, { align: 'right' });
      yPos += lineHeight;
      doc.text(`Payment Date: ${new Date(receipt.date).toLocaleDateString()}`, rightColumnX, yPos, { align: 'right' });
      
      // ===== BILLING INFO SECTION =====
      // Reset position for left side billing info
      yPos = yPos - (lineHeight * 2); // Align with receipt details
      
      doc.setFontSize(10);
      doc.text('Bill To:', margin, yPos);
      yPos += lineHeight;
      doc.text(receipt.studentName, margin, yPos);
      yPos += lineHeight;
      
      // Use the student profile ID or fallback to transaction ID substring
      const displayStudentId = studentProfile?.idNumber || receipt.transactionId.substring(0, 8);
      doc.text(`Student ID: ${displayStudentId}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Class: ${receipt.className}`, margin, yPos);
      
      // Calculate table position and column widths for exact UI match
      yPos = 95; // Adjust starting position to match UI spacing
      const tableWidth = pageWidth - (margin * 2);
      
      // Define column widths for 3 columns matching ReceiptModal
      const colWidths = {
        subject: tableWidth * 0.25,   // Subject column (25%)
        className: tableWidth * 0.5,  // Class Name column (50%)
        fee: tableWidth * 0.25        // Fee column (25%)
      };

      // Define column positions
      const col1 = margin;                    // Subject starts at left margin
      const col2 = col1 + colWidths.subject;  // Class Name starts after Subject
      const col3 = col2 + colWidths.className; // Fee starts after Class Name
      
      // ===== TABLE HEADER SECTION =====
      // Header styling to match UI
      doc.setDrawColor(220, 220, 220); // Light gray borders exactly like UI
      doc.setLineWidth(0.5); // Thin borders like UI
      doc.setFillColor(248, 248, 248); // Very light gray background for header
      
      // Create header cells with background
      doc.setFillColor(248, 248, 248);
      doc.rect(col1, yPos, colWidths.subject, 15, 'F'); // Subject header with fill
      doc.rect(col2, yPos, colWidths.className, 15, 'F'); // Class Name header with fill
      doc.rect(col3, yPos, colWidths.fee, 15, 'F'); // Fee header with fill
      
      // Add borders to header cells
      doc.setDrawColor(220, 220, 220);
      doc.rect(col1, yPos, colWidths.subject, 15); // Subject header border
      doc.rect(col2, yPos, colWidths.className, 15); // Class Name header border
      doc.rect(col3, yPos, colWidths.fee, 15); // Fee header border
      
      // Add header text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Subject', col1 + 15, yPos + 10); // Left-aligned with padding
      doc.text('Class Name', col2 + 15, yPos + 10); // Left-aligned with padding
      doc.text('Fee', col3 + colWidths.fee - 15, yPos + 10, { align: 'right' }); // Right-aligned
      
      // ===== TABLE DATA SECTION =====
      doc.setFont('helvetica', 'normal');
      yPos += 15; // Move to data row
      
      // Data cells with borders
      doc.rect(col1, yPos, colWidths.subject, 15);
      doc.rect(col2, yPos, colWidths.className, 15);
      doc.rect(col3, yPos, colWidths.fee, 15);
      
      // Add data content matching UI alignment
      doc.text('General', col1 + 15, yPos + 10); // Left-aligned with padding
      doc.text(receipt.className, col2 + 15, yPos + 10); // Left-aligned with padding
      doc.text(`$${receipt.amount.toFixed(2)}`, col3 + colWidths.fee - 15, yPos + 10, { align: 'right' }); // Right-aligned
      
      // ===== PAYMENT SUMMARY SECTION =====
      // Move down after table
      yPos += 30;
      
      // Right-aligned summary section exactly matching UI
      const summaryWidth = 100;
      const summaryRight = pageWidth - margin;
      const summaryLeft = summaryRight - summaryWidth;
      
      // Total row
      doc.text('Total', summaryLeft, yPos);
      doc.text(`$${receipt.amount.toFixed(2)}`, summaryRight, yPos, { align: 'right' });
      
      // Paid row
      yPos += lineHeight + 3;
      doc.text('Paid', summaryLeft, yPos);
      doc.text(`$${receipt.amount.toFixed(2)}`, summaryRight, yPos, { align: 'right' });
      
      // Balance Due row - bold as shown in UI
      yPos += lineHeight + 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Balance Due', summaryLeft, yPos);
      doc.text('$0.00', summaryRight, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      
      // ===== PAYMENT INFO SECTION =====
      yPos += 25;
      
      // Payment Method on left
      doc.text('Payment Method:', margin, yPos);
      doc.text(receipt.paymentMethod, margin, yPos + lineHeight);
      
      // Payment Status on right with green 'Paid' text
      doc.text('Payment Status:', summaryRight, yPos, { align: 'right' });
      doc.setTextColor(0, 170, 0); // Bright green for 'Paid' status
      doc.setFont('helvetica', 'bold');
      doc.text(receipt.status, summaryRight, yPos + lineHeight, { align: 'right' });
      
      // Reset text color and font
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // ===== NOTES/TERMS SECTION =====
      yPos += 25;
      doc.text('Notes / Terms', margin, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      const notes = 'Thank you for enrolling in our class. This receipt confirms your payment and enrollment. Please refer to the class schedule for start dates and times. For any questions or assistance, contact our administration office.';
      
      // Word wrap for notes text
      const splitNotes = doc.splitTextToSize(notes, pageWidth - (2 * margin));
      doc.text(splitNotes, margin, yPos);
      
      // ===== FOOTER =====
      yPos = pageHeight - 15;
      doc.setFontSize(8);
      doc.text('This is an official receipt for your enrollment payment.', pageWidth / 2, yPos, { align: 'center' });
      doc.text('© ' + new Date().getFullYear() + ' Tuition System. All rights reserved.', pageWidth / 2, yPos + 4, { align: 'center' });

      // Save the PDF with properly formatted name
      doc.save(`NexStack-EnrollmentReceipt-${receipt.receiptNumber}.pdf`);

      // Cleanup loading indicator
      setTimeout(() => {
        if (document.body.contains(loadingToast)) {
          document.body.removeChild(loadingToast);
        }
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto print:shadow-none print:p-0">

      
      {/* Header Section with Logo and Company Info */}
      <div className="flex justify-between items-start mb-8 pb-4">
        <div className="flex items-center">
          <div className="bg-indigo-600 text-white p-3 rounded-lg h-16 w-16 flex items-center justify-center mr-3">
            <span className="text-2xl font-bold">TS</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">NexStack Tuition</h2>
            <p className="text-gray-600 text-sm">Singapore</p>
            <p className="text-gray-600 text-sm">Singapore, 90588146</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-500 uppercase">RECEIPT</h1>
          <div className="w-full h-0.5 bg-indigo-600 mt-1"></div>
        </div>
      </div>

      {/* Billing and Invoice Info */}
      <div className="flex justify-between mb-8">
        <div>
          <p className="text-gray-600 font-medium mb-1">Bill To:</p>
          <p className="font-medium">{receipt.studentName}</p>
          <p className="text-gray-600">
            Student ID: {studentProfile?.idNumber || receipt.transactionId.substring(0, 8)}
            {isLoading && <span className="ml-2 inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>}
          </p>
          <p className="text-gray-600">Class: {receipt.className}</p>
        </div>
        <div className="text-right">
          <div className="mb-1">
            <span className="inline-block w-32 text-gray-600">Receipt #</span>
            <span className="font-medium">{receipt.receiptNumber}</span>
          </div>
          <div className="mb-1">
            <span className="inline-block w-32 text-gray-600">Receipt Date</span>
            <span className="font-medium">{new Date(receipt.date).toLocaleDateString()}</span>
          </div>
          <div className="mb-1">
            <span className="inline-block w-32 text-gray-600">Payment Date</span>
            <span className="font-medium">{new Date(receipt.date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 text-left border border-gray-300">Subject</th>
              <th className="py-2 px-4 text-left border border-gray-300">Class Name</th>
              <th className="py-2 px-4 text-right border border-gray-300">Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-4 border border-gray-300">General</td>
              <td className="py-2 px-4 border border-gray-300">{receipt.className}</td>
              <td className="py-2 px-4 text-right border border-gray-300">${receipt.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="flex justify-end mb-8">
        <div className="w-72">
          <div className="flex justify-between py-2">
            <span className="font-medium">Total</span>
            <span className="font-medium">${receipt.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-b border-gray-200">
            <span className="font-medium">Paid</span>
            <span className="font-medium">${receipt.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-bold">Balance Due</span>
            <span className="font-bold">$0.00</span>
          </div>
        </div>
      </div>

      {/* Payment Method & Status */}
      <div className="mb-6 border-t border-gray-200 pt-4">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-600">Payment Method:</p>
            <p className="font-medium">{receipt.paymentMethod}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Payment Status:</p>
            <p className="text-green-600 font-bold">{receipt.status}</p>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Notes / Terms</h3>
        <p className="text-gray-600 text-sm">
          Thank you for enrolling in our class. This receipt confirms your payment and enrollment. 
          Please refer to the class schedule for start dates and times. For any questions or assistance, 
          contact our administration office.
        </p>
      </div>

      <div className="text-center mt-8 print:hidden">
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex items-center px-4 py-2 ${
              isPrinting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white rounded-md`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
        
        <div className="mt-6">
          <Link 
            href="/student/classes" 
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View My Classes
          </Link>
        </div>
      </div>

      <div className="text-center text-gray-500 text-xs mt-8 print:mt-12">
        <p>This is an official receipt for your enrollment payment.</p>
        <p>© {new Date().getFullYear()} Tuition System. All rights reserved.</p>
      </div>
    </div>
  );
}
