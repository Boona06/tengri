import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TENGER ATLS — Зөн совингоо дагаарай",
  description: "Нууцлаг зөгнөлт картаа сонгож, өөрийгөө эргэцүүлэх аялалд нэгдээрэй. Насанд хүрэгчдэд зориулсан зөгнөлт тайлбар.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="mn"
      className={`${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
