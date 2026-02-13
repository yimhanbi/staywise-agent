"use client";

import type { ReactElement } from "react";
import {
  addDays,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";

type QuickRangeType = "weekend" | "nextWeek" | "month";

function getWeekendRange(today: Date): DateRange {
  const day = getDay(today);
  let saturday: Date;
  if (day === 0) {
    saturday = addDays(today, 6);
  } else if (day === 6) {
    saturday = today;
  } else {
    saturday = addDays(today, 6 - day);
  }
  const sunday = addDays(saturday, 1);
  return { from: saturday, to: sunday };
}

export interface DatePickerModalProps {
  selectedRange: DateRange | undefined;
  onSelectRange: (range: DateRange | undefined) => void;
  onClose?: () => void;
}

const QUICK_LABELS: { type: QuickRangeType; label: string }[] = [
  { type: "weekend", label: "이번 주말" },
  { type: "nextWeek", label: "다음 주" },
  { type: "month", label: "이번 달" },
];

export function DatePickerModal({
  selectedRange,
  onSelectRange,
}: DatePickerModalProps): ReactElement {
  const handleQuickSelect = (type: QuickRangeType): void => {
    const today = new Date();
    let newRange: DateRange;
    if (type === "weekend") {
      newRange = getWeekendRange(today);
    } else if (type === "nextWeek") {
      newRange = {
        from: addDays(today, 7),
        to: addDays(today, 14),
      };
    } else {
      newRange = {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
    }
    onSelectRange(newRange);
  };

  return (
    <div className="flex bg-white p-6 rounded-3xl border border-gray-100 gap-6 min-w-0">
      <div className="flex flex-col gap-2 w-44 shrink-0">
        <h3 className="text-sm font-bold mb-1">날짜 선택</h3>
        {QUICK_LABELS.map(({ type, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleQuickSelect(type)}
            className="px-4 py-3 border border-gray-200 rounded-xl text-left hover:border-[#0F766E] hover:text-[#0F766E] transition font-medium text-sm"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="border-l border-gray-100 pl-6 min-w-[280px] shrink-0">
        <DayPicker
          mode="range"
          selected={selectedRange}
          onSelect={onSelectRange}
          locale={ko}
          numberOfMonths={1}
          className="rdp-custom border-none"
        />
      </div>
    </div>
  );
}

export function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return "날짜 추가";
  const fromStr = format(range.from, "M월 d일", { locale: ko });
  if (!range.to || range.from.getTime() === range.to.getTime()) {
    return fromStr;
  }
  const toStr = format(range.to, "M월 d일", { locale: ko });
  return `${fromStr} ~ ${toStr}`;
}
