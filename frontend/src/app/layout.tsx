import "./globals.css";
import { Providers } from "@/components/providers";
import { AppLayoutWrapper } from "@/components/layout/AppLayoutWrapper";

export const metadata = {
    title: "CitizenLink",
    description: "CitizenLink Platform",
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

