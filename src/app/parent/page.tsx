'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ParentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user.role !== 'PARENT') {
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Parent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Children</h2>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">View your children's profiles and academic information</p>
          <Link href="/parent/children" className="text-indigo-600 hover:text-indigo-800 font-medium">
            View Children →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Attendance</h2>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">Monitor your children's attendance records</p>
          <Link href="/parent/attendance" className="text-indigo-600 hover:text-indigo-800 font-medium">
            View Attendance →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Academic Performance</h2>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">Track your children's grades and academic progress</p>
          <Link href="/parent/performance" className="text-indigo-600 hover:text-indigo-800 font-medium">
            View Performance →
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Payments</h2>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 mb-4">View and manage tuition payments and invoices</p>
          <Link href="/parent/payments" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Manage Payments →
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Children's Academic Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Child
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade Level
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GPA
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Sample data - would be replaced with real data */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-bold">JS</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">James Smith</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Grade 10</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">3.8</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      98%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href="/parent/children/1" className="text-indigo-600 hover:text-indigo-900">View Details</Link>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                        <span className="text-pink-600 font-bold">ES</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Emma Smith</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Grade 8</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">3.6</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      95%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link href="/parent/children/2" className="text-indigo-600 hover:text-indigo-900">View Details</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Payment Summary</h2>
            <Link href="/parent/payments" className="text-sm text-indigo-600 hover:text-indigo-800">
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Tuition Fee - May 2025</h3>
                <span className="text-red-600 font-medium">Due in 5 days</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-3">
                <span>Invoice #INV-2025-05-123</span>
                <span>$750.00</span>
              </div>
              <button className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition-colors">
                Pay Now
              </button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Science Lab Fee</h3>
                <span className="text-green-600 font-medium">Paid</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-3">
                <span>Invoice #INV-2025-04-098</span>
                <span>$150.00</span>
              </div>
              <button className="w-full bg-gray-100 text-gray-500 py-2 rounded cursor-not-allowed">
                Paid on May 2, 2025
              </button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Field Trip - Museum</h3>
                <span className="text-yellow-600 font-medium">Pending Approval</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-3">
                <span>Invoice #INV-2025-05-145</span>
                <span>$45.00</span>
              </div>
              <button className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 transition-colors">
                Approve & Pay
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="font-medium">Total Outstanding</span>
              <span className="font-bold">$795.00</span>
            </div>
            <div className="text-sm text-gray-600">
              Next payment due: May 12, 2025
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2 mr-4">
                <span className="text-indigo-600 font-bold">15</span>
                <span className="block text-xs text-indigo-600">MAY</span>
              </div>
              <div>
                <h3 className="font-medium">Parent-Teacher Conference</h3>
                <p className="text-sm text-gray-600">4:00 PM - 6:00 PM</p>
                <p className="text-sm text-gray-600">Main Building, Room 105</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-2 mr-4">
                <span className="text-green-600 font-bold">20</span>
                <span className="block text-xs text-green-600">MAY</span>
              </div>
              <div>
                <h3 className="font-medium">Science Fair</h3>
                <p className="text-sm text-gray-600">10:00 AM - 2:00 PM</p>
                <p className="text-sm text-gray-600">School Gymnasium</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 mr-4">
                <span className="text-purple-600 font-bold">25</span>
                <span className="block text-xs text-purple-600">MAY</span>
              </div>
              <div>
                <h3 className="font-medium">End of Year Concert</h3>
                <p className="text-sm text-gray-600">6:00 PM - 8:00 PM</p>
                <p className="text-sm text-gray-600">School Auditorium</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/parent/events" className="text-indigo-600 hover:text-indigo-800 font-medium">
              View All Events →
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Messages from Teachers</h2>
          <div className="space-y-4">
            <div className="p-4 border-l-4 border-indigo-500 bg-indigo-50 rounded-r-md">
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Ms. Johnson - Mathematics</h3>
                <span className="text-xs text-gray-500">Today, 10:30 AM</span>
              </div>
              <p className="text-sm text-gray-600">James has been doing excellent work in his calculus assignments. He scored 95% on the latest test.</p>
              <div className="mt-2 flex justify-end">
                <button className="text-sm text-indigo-600 hover:text-indigo-800">Reply</button>
              </div>
            </div>
            
            <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-r-md">
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Mr. Davis - Science</h3>
                <span className="text-xs text-gray-500">Yesterday, 2:15 PM</span>
              </div>
              <p className="text-sm text-gray-600">Reminder: Emma needs to complete her science project by next Friday. Please ensure she has all the necessary materials.</p>
              <div className="mt-2 flex justify-end">
                <button className="text-sm text-indigo-600 hover:text-indigo-800">Reply</button>
              </div>
            </div>
            
            <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-r-md">
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">Mrs. Wilson - English</h3>
                <span className="text-xs text-gray-500">May 5, 2025</span>
              </div>
              <p className="text-sm text-gray-600">Emma's essay on Shakespeare was outstanding. I've recommended her for the school literary magazine.</p>
              <div className="mt-2 flex justify-end">
                <button className="text-sm text-indigo-600 hover:text-indigo-800">Reply</button>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/parent/messages" className="text-indigo-600 hover:text-indigo-800 font-medium">
              View All Messages →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
