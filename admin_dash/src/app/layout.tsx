import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SideNav from "@/components/SideNav";
import TopNav from "@/components/TopNav";
import { AuthProvider } from "@/context/AuthContext";
import MainWrapper from "@/components/MainWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DailyNewsHub Admin Console",
  description: "Enterprise management dashboard for Daily News Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        <AuthProvider>
          <SideNav />
          <TopNav />
          <MainWrapper>{children}</MainWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
