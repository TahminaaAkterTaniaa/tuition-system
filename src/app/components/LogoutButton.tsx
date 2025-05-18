'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Use a simple redirect to avoid React hook errors
      await signOut({ 
        callbackUrl: '/',
        redirect: true
      });
    } catch (error) {
      console.error('Logout error:', error);
      // If there's an error, redirect manually
      window.location.href = '/';
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={className || "bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
