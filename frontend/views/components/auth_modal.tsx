"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/views/auth_context";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "register") await register(email, password, name);
      else await login(email, password);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "요청을 처리하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0F766E]">Staywise</p>
            <h2 id="auth-title" className="mt-1 text-2xl font-bold text-gray-900">
              {mode === "login" ? "로그인" : "회원가입"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">좋아요한 숙소를 저장하고 언제든 다시 확인하세요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="로그인 창 닫기" className="rounded-full p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <label className="block text-sm font-medium text-gray-700">
              이름
              <input id="auth-name" name="name" required minLength={1} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-[#0F766E]" />
            </label>
          )}
          <label className="block text-sm font-medium text-gray-700">
            이메일
            <input id="auth-email" name="email" required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-[#0F766E]" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            비밀번호
            <input id="auth-password" name="password" required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-[#0F766E]" />
            {mode === "register" && <span className="mt-1 block text-xs text-gray-500">8자 이상 입력해 주세요.</span>}
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-xl bg-[#0F766E] font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60">
            {isSubmitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-600">
          {mode === "login" ? "아직 계정이 없으신가요?" : "이미 계정이 있으신가요?"}{" "}
          <button type="button" onClick={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }} className="font-semibold text-[#0F766E] hover:underline">
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </p>
      </section>
    </div>
  );
}
