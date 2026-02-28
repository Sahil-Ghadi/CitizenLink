import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/providers";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";

export const metadata = {
    title: "Citizen Portal",
    description: "Citizen Portal — Smart Government Complaint Resolution Platform",
    icons: {
        icon: "/favicon.png",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <AppLayoutWrapper>
                        {children}
                    </AppLayoutWrapper>
                </Providers>
            </body>
        </html>
    );
}

