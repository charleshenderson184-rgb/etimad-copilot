import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";
import { ConfettiProvider } from "@/components/confetti";
import { TourProvider, TourAutoStarter } from "@/components/product-tour";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Etimad Copilot — منافسات",
  description: "Government tender compliance analysis and proposal drafting for KSA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-stone-950 dark:text-stone-100">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfettiProvider>
                <TourProvider>
                  <TourAutoStarter />
                  {children}
                </TourProvider>
              </ConfettiProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
