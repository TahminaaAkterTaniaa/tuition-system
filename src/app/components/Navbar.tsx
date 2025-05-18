'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                Tuition System
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Home
              </Link>
              <Link
                href="/classes"
                className="border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Classes
              </Link>
              {session?.user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Admin Dashboard
                </Link>
              )}
              {session?.user.role === 'TEACHER' && (
                <Link
                  href="/teacher"
                  className="border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Teacher Dashboard
                </Link>
              )}
              {session?.user.role === 'STUDENT' && (
                <Link
                  href="/student"
                  className="border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Student Dashboard
                </Link>
              )}
              {session?.user.role === 'PARENT' && (
                <Link
                  href="/parent"
                  className="border-transparent text-gray-500 hover:border-indigo-500 hover:text-indigo-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Parent Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {session ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="flex items-center text-gray-700 hover:text-indigo-700"
                >
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                    <span className="text-indigo-600 font-bold">
                      {session.user.name?.charAt(0) || session.user.email.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm">
                    {session.user.name || session.user.email}
                  </span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-500 hover:text-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="bg-indigo-50 border-indigo-500 text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
            >
              Home
            </Link>
            <Link
              href="/classes"
              className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
            >
              Classes
            </Link>
            {session?.user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              >
                Admin Dashboard
              </Link>
            )}
            {session?.user.role === 'TEACHER' && (
              <Link
                href="/teacher"
                className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              >
                Teacher Dashboard
              </Link>
            )}
            {session?.user.role === 'STUDENT' && (
              <Link
                href="/student"
                className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              >
                Student Dashboard
              </Link>
            )}
            {session?.user.role === 'PARENT' && (
              <Link
                href="/parent"
                className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
              >
                Parent Dashboard
              </Link>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {session ? (
              <div className="flex items-center px-4">
                <Link href="/profile" className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center">
                      <span className="text-indigo-600 font-bold">
                        {session.user.name?.charAt(0) || session.user.email.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {session.user.name || session.user.email}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {session.user.email}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-around px-4">
                <Link
                  href="/login"
                  className="text-gray-500 hover:text-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
