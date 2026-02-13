'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { AnimatePresence, motion } from "framer-motion";
import { DatePickerModal, formatDateRangeLabel } from "./date_picker_modal";

type SearchTab = "location" | "date" | "guest" | null;
type GuestType = "adults" | "children" | "infants";

const RECOMMENDED_CITIES = ["서울", "전주", "제주도", "부산"] as const;

interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
}

interface SearchSectionProps {
  title: string;
  placeholder: string;
  active: boolean;
  onClick: () => void;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  isLast?: boolean;
}

const SearchSection = ({
  title,
  placeholder,
  active,
  onClick,
  value,
  onChange,
  readOnly = false,
  isLast = false,
}: SearchSectionProps) => {
  const containerClass = `flex-1 px-6 py-3 cursor-pointer transition ${active ? "bg-white rounded-full" : "hover:bg-gray-100"} ${isLast ? "mr-1" : ""}`;

  if (onChange) {
    return (
      <div onClick={onClick} className={containerClass}>
        <div className="text-[10px] font-extrabold uppercase text-gray-900">{title}</div>
        <input
          className="bg-transparent text-sm text-black font-medium outline-none w-full placeholder:text-gray-400"
          placeholder={placeholder}
          value={value}
          onFocus={onClick}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (readOnly && value !== undefined) {
    return (
      <div onClick={onClick} className={containerClass}>
        <div className="text-[10px] font-extrabold uppercase text-gray-900">{title}</div>
        <input
          className="bg-transparent text-sm text-black font-medium outline-none w-full placeholder:text-gray-400 cursor-pointer read-only:cursor-pointer"
          placeholder={placeholder}
          value={value}
          readOnly
          onFocus={onClick}
        />
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${containerClass} text-left`}>
      <div className="text-[10px] font-extrabold uppercase text-gray-900">{title}</div>
      <div className="text-sm text-black font-medium mt-0.5">{placeholder}</div>
    </button>
  );
};

export const SearchBar = ({ searchQuery, onSearchQueryChange, onSearch }: SearchBarProps) => {
  const [activeTab, setActiveTab] = useState<SearchTab>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateLabel, setDateLabel] = useState("날짜 추가");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setActiveTab(null);
      }
    };

    document.addEventListener

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveTab(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const updateGuestCount = (type: GuestType, delta: -1 | 1) => {
    if (type === "adults") {
      setAdults((prev) => Math.max(1, prev + delta));
      return;
    }
    if (type === "children") {
      setChildren((prev) => Math.max(0, prev + delta));
      return;
    }
    setInfants((prev) => Math.max(0, prev + delta));
  };

  const totalGuests = adults + children + infants;
  const guestLabel = totalGuests > 0 ? `게스트 ${totalGuests}명` : "게스트 추가";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-[850px]">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`flex items-center rounded-full border transition-all duration-300 ${
            activeTab
              ? "bg-white border-gray-200 shadow-xl scale-[1.02]"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="relative flex-1">
            <SearchSection
              title="여행지"
              placeholder="도시나 명소로 검색"
              active={activeTab === "location"}
              onClick={() => setActiveTab("location")}
              value={searchQuery}
              onChange={onSearchQueryChange}
            />
            <AnimatePresence>
              {activeTab === "location" && (
                <motion.div
                  key="location"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-[calc(100%+12px)] left-0 z-[110] w-full min-w-[320px] max-w-[420px] bg-white rounded-[32px] border border-gray-100 shadow-xl p-6"
                >
                  <div className="text-xs font-bold mb-4">추천 여행지</div>
                  <div className="grid grid-cols-1 gap-3">
                    {RECOMMENDED_CITIES.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          onSearchQueryChange(city);
                          setActiveTab("date");
                        }}
                        className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-xl text-left"
                      >
                        <div className="p-2 bg-gray-100 rounded-lg">📍</div>
                        <span className="text-sm">{city}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex-1 overflow-visible">
            <SearchSection
              title="날짜"
              placeholder="날짜 추가"
              active={activeTab === "date"}
              onClick={() => setActiveTab("date")}
              value={dateLabel}
              readOnly
            />
            <AnimatePresence>
              {activeTab === "date" && (
                <motion.div
                  key="date"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-[calc(100%+12px)] left-0 z-[110] w-[680px] bg-white rounded-[32px] border border-gray-100 shadow-xl p-6"
                >
                  <DatePickerModal
                    selectedRange={dateRange}
                    onSelectRange={(r) => {
                      setDateRange(r);
                      setDateLabel(formatDateRangeLabel(r));
                      if (r?.from && r?.to) setActiveTab("guest");
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex-1 mr-1">
            <SearchSection
              title="여행자"
              placeholder="게스트 추가"
              active={activeTab === "guest"}
              onClick={() => setActiveTab("guest")}
              value={guestLabel}
              readOnly
              isLast
            />
            <AnimatePresence>
              {activeTab === "guest" && (
                <motion.div
                  key="guest"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-[calc(100%+12px)] left-0 z-[110] w-full min-w-[320px] max-w-[420px] bg-white rounded-[32px] border border-gray-100 shadow-xl p-6"
                >
                  <div className="text-xs font-bold mb-4">인원 선택</div>
                  <div className="space-y-3">
                    {[
                      { key: "adults", label: "성인", desc: "13세 이상", value: adults },
                      { key: "children", label: "어린이", desc: "2~12세", value: children },
                      { key: "infants", label: "유아", desc: "2세 미만", value: infants },
                    ].map((guest) => (
                      <div key={guest.key} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{guest.label}</p>
                          <p className="text-xs text-gray-500">{guest.desc}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateGuestCount(guest.key as GuestType, -1)}
                            className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:border-[#0F766E] hover:text-[#0F766E]"
                          >
                            -
                          </button>
                          <span className="w-4 text-center">{guest.value}</span>
                          <button
                            type="button"
                            onClick={() => updateGuestCount(guest.key as GuestType, 1)}
                            className="h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:border-[#0F766E] hover:text-[#0F766E]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActiveTab(null)}
                      className="w-full mt-2 rounded-xl bg-[#0F766E] text-white py-2 text-sm font-semibold hover:bg-[#115E59]"
                    >
                      적용
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pr-2">
            <button
              type="submit"
              className="bg-[#0F766E] text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold hover:bg-[#115E59] transition"
              aria-label="검색"
            >
              <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4">
                <circle cx="14" cy="14" r="10" />
                <path d="M21 21l7 7" />
              </svg>
              검색
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
