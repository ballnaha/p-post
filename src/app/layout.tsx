import type { Metadata } from "next";
import ClientThemeProvider from "./components/ClientThemeProvider";
import SessionProvider from "./components/SessionProvider";
import ProtectedLayout from "./components/ProtectedLayout";
import ClientSnackbarProvider from "../components/ClientSnackbarProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Police Position Management System",
  description: "ระบบจัดการ",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <ClientThemeProvider>
            <ClientSnackbarProvider>
              <ProtectedLayout>
                {children}
              </ProtectedLayout>
            </ClientSnackbarProvider>
          </ClientThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
