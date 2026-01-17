import "./globals.css";
import { Molle } from "next/font/google";

const molle = Molle({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-molle",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={molle.variable}>{children}</body>
    </html>
  );
}
