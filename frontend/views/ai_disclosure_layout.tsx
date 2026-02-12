"use client";

import type { ReactNode } from "react";
import type { LayoutConfig } from "@/models";

interface AiDisclosureLayoutProps {
  children: ReactNode;
  config?: Partial<LayoutConfig>;
}

/**
 * AI 고지 의무 레이아웃.
 * AI 활용 서비스임을 사용자에게 명시하는 영역을 포함합니다.
 */
export function AiDisclosureLayout({
  children,
  config,
}: AiDisclosureLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
