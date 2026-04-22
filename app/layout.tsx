import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElectionBot — Your Civic Education Assistant",
  description:
    "Learn about election processes, voter registration, EVMs, vote counting, and more with ElectionBot — an AI-powered civic education assistant for Indian elections.",
  keywords: [
    "election",
    "voting",
    "civic education",
    "India elections",
    "voter registration",
    "EVM",
    "election process",
  ],
  openGraph: {
    title: "ElectionBot — Your Civic Education Assistant",
    description:
      "Interactive AI assistant to learn about election processes, timelines, and voting steps.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
