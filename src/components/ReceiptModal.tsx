'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface ReceiptData {
  receiptNumber: string;
  transactionId: string;
  date: string;
  studentName: string;
  className: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  isLoading: boolean;
}

export default function ReceiptModal({ isOpen, onClose, receipt, isLoading }: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 500);
  };

  const handleDownloadPDF = () => {
    // In a real implementation, this would generate a PDF
    // For this demo, we'll just show an alert
    alert('PDF download functionality would be implemented here');
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Loading receipt...</p>
                  </div>
                ) : receipt ? (
                  <div className="print:shadow-none print:p-0">
                    <Dialog.Title as="div" className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Payment Receipt</h3>
                      <button 
                        onClick={onClose} 
                        className="text-gray-500 hover:text-gray-700 print:hidden"
                        aria-label="Close receipt modal"
                        title="Close receipt modal"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Dialog.Title>

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
                        <p className="text-gray-600">Student ID: {receipt.transactionId.substring(0, 8)}</p>
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
                            <th className="py-2 px-4 text-left border border-gray-300">Item</th>
                            <th className="py-2 px-4 text-left border border-gray-300">Description</th>
                            <th className="py-2 px-4 text-right border border-gray-300">Unit Price</th>
                            <th className="py-2 px-4 text-center border border-gray-300">Quantity</th>
                            <th className="py-2 px-4 text-right border border-gray-300">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-4 border border-gray-300">Tuition</td>
                            <td className="py-2 px-4 border border-gray-300">{receipt.className} - Enrollment Fee</td>
                            <td className="py-2 px-4 text-right border border-gray-300">${receipt.amount.toFixed(2)}</td>
                            <td className="py-2 px-4 text-center border border-gray-300">1</td>
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
                    </div>

                    <div className="text-center text-gray-500 text-xs mt-8 print:mt-12">
                      <p>This is an official receipt for your enrollment payment.</p>
                      <p>© {new Date().getFullYear()} Tuition System. All rights reserved.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-4 text-gray-600">No receipt available for this enrollment</p>
                    <button
                      onClick={onClose}
                      className="mt-6 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded"
                    >
                      Close
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
