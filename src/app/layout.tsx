import type { Metadata } from "next";
import ClientThemeProvider from "./components/ClientThemeProvider";
import SessionProvider from "./components/SessionProvider";
import ProtectedLayout from "./components/ProtectedLayout";
import ClientSnackbarProvider from "../components/ClientSnackbarProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Police Position Management System",
  description: "ระบบจัดการ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head></head>
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
