import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockbud | Premium Product Catalog",
  description: "Explore our curated selection of high-end products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
