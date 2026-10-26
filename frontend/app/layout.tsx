import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "@/views/providers";
import { AiDisclosureLayout } from "@/views/ai_disclosure_layout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Staywise — AI 호텔 예약",
  description: "AI 네이티브 호텔 예약 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
return (
    <html lang="ko">
      <body className="antialiased">
        <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
        <Providers>
          <AiDisclosureLayout>{children}</AiDisclosureLayout>
        </Providers>
      </body>
    </html>
  );
}
