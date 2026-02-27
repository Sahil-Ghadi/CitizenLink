"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";

export default function RootPage() {
    const { isLoggedIn } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        if (isLoggedIn) {
            router.replace("/dashboard");
        } else {
            router.replace("/login");
        }
    }, [isLoggedIn, router]);

    return null;
}
