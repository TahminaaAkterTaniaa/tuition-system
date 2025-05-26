'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Sign out and redirect to home page
      const result = await signOut({ 
        redirect: false,
        callbackUrl: '/'
      });
      
      // Force a hard refresh to ensure all session data is cleared
      window.location.href = '/';
      
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
      className={`${className || "bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"} ${
        isLoggingOut ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      aria-label="Logout"
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
