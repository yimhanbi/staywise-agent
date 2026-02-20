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
  const KAKAO_KEY =
    process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ??
    process.env.NEXT_PUBLIC_KAKAO_MAP_CLIENT_ID;

return (
    <html lang="ko">
      <head>
        {KAKAO_KEY ? (
          <Script
            src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`}
            strategy="beforeInteractive"
          />
        ) : null}
      </head>
      <body className="antialiased">
        <Providers>
          <AiDisclosureLayout>{children}</AiDisclosureLayout>
        </Providers>
      </body>
    </html>
  );
}
