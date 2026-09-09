"use client"
import React, { useEffect } from 'react'
import { useAuth, RedirectToSignIn, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useGetCurrentUserQuery } from '@/state/api';
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar"; 
import StoreProvider, { useAppSelector } from './redux';


const DashboardLayout = ({children} : {children: React.ReactNode}) => {
    const isSidebarCollapsed = useAppSelector(
        (state) => state.global.isSidebarCollapsed,
    );

    const isDarkMode = useAppSelector(
        (state) => state.global.isDarkMode
    );

    useEffect(()=>{
        if (isDarkMode) {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")

        }
    })
  return (
    <div className = "flex min-h-screen w-full bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <Sidebar/>
     
      <main
        className={`dark:bg-dark-bg flex w-full flex-col bg-gray-50 transition-[padding] duration-300 ${
          isSidebarCollapsed ? "" : "md:pl-64"
        }`}
      >
        {/*navbar*/}
        <Navbar/>
        {children}
      </main>
    </div>
  )
}

const DashboardWrapper = ({children}: {children: React.ReactNode}) => {
    const { isLoaded, isSignedIn, sessionId } = useAuth();
    const pathname = usePathname();
    if (pathname === "/" || /^\/sign-(in|up)(\/|$)/.test(pathname)) return <>{children}</>;
    if (!isLoaded) return <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-dark-bg dark:text-white" role="status">Loading session...</div>;
    if (!isSignedIn) return <RedirectToSignIn />;
    return (
        <StoreProvider key={sessionId}>
            <AccountGate><DashboardLayout>{children}</DashboardLayout></AccountGate>
        </StoreProvider>
    )
}

export default DashboardWrapper

function AccountGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isFetching, isError, refetch } = useGetCurrentUserQuery();
  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-dark-bg dark:text-white" role="status">Loading your account...</div>;
  if (isError) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-gray-900 dark:bg-dark-bg dark:text-white">
      <p role="alert">Unable to load your account. Please retry.</p>
      <div className="flex items-center gap-4">
        <UserButton />
        <button className="rounded bg-blue-primary px-4 py-2 text-white disabled:opacity-50" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? "Retrying..." : "Retry"}
        </button>
      </div>
    </div>
  );
  return <>{children}</>;
}
