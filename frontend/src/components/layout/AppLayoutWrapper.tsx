"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppLayout } from "./AppLayout";
import { useAppContext } from "@/context/AppContext";

// Pages that don't need the sidebar/app shell
const PUBLIC_PATHS = ["/", "/login", "/onboarding"];

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isLoggedIn, loading } = useAppContext();

    const isPublic = PUBLIC_PATHS.includes(pathname);

    useEffect(() => {
        if (!loading && !isLoggedIn && !isPublic) {
            // Unauthenticated user trying to access a protected page
            router.replace("/");
        }
    }, [loading, isLoggedIn, isPublic, router]);

    // Public pages render without the sidebar shell
    if (isPublic) {
        return <>{children}</>;
    }

    // Show nothing while auth state is loading (prevents flash)
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isLoggedIn) return null;

    return <AppLayout>{children}</AppLayout>;
}

