"use client";

import type { ReactNode } from "react";
import type { LayoutConfig } from "@/models";

interface AiDisclosureLayoutProps {
  children: ReactNode;
  config?: Partial<LayoutConfig>;
}

const DEFAULT_DISCLOSURE_TEXT =
  "본 서비스는 인공지능(AI)을 활용하여 예약 추천 및 답변을 제공합니다. AI 생성 결과는 참고용이며, 최종 예약·결정 시 확인이 필요할 수 있습니다.";

/**
 * AI 고지 의무 레이아웃.
 * AI 활용 서비스임을 사용자에게 명시하는 영역을 포함합니다.
 */
export function AiDisclosureLayout({
  children,
  config,
}: AiDisclosureLayoutProps): React.ReactElement {
  const appName = config?.appName ?? "Staywise";
  const disclosureText =
    config?.aiDisclosure?.disclosureText ?? DEFAULT_DISCLOSURE_TEXT;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-semibold text-neutral-900">
            {appName}
          </span>
          <aside
            className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900"
            role="status"
            aria-label="AI 서비스 고지"
          >
            {disclosureText}
          </aside>
        </div>
      </header>
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
