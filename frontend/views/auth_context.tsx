"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Hotel } from "@staywise/shared-types";
import { buildApiUrl } from "@/services/api_client";

export interface StaywiseUser {
  id: number;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: StaywiseUser | null;
  favorites: Hotel[];
  favoriteIds: Set<string>;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleFavorite: (hotelId: string | number) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function responseMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : "요청을 처리하지 못했습니다.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaywiseUser | null>(null);
  const [favorites, setFavorites] = useState<Hotel[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshFavorites = useCallback(async () => {
    const response = await fetch(buildApiUrl("/favorites"), { credentials: "same-origin" });
    if (!response.ok) throw new Error(await responseMessage(response));
    const body = (await response.json()) as { hotels: Hotel[] };
    setFavorites(body.hotels ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(buildApiUrl("/auth/me"), { credentials: "same-origin" });
        const body = (await response.json()) as { user: StaywiseUser | null };
        if (!active) return;
        setUser(body.user);
        if (body.user) {
          const favoritesResponse = await fetch(buildApiUrl("/favorites"), { credentials: "same-origin" });
          if (favoritesResponse.ok) {
            const favoritesBody = (await favoritesResponse.json()) as { hotels: Hotel[] };
            if (active) setFavorites(favoritesBody.hotels ?? []);
          }
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsAuthLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const authenticate = useCallback(async (endpoint: string, payload: object) => {
    const response = await fetch(buildApiUrl(endpoint), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await responseMessage(response));
    const body = (await response.json()) as { user: StaywiseUser };
    setUser(body.user);
    const favoriteResponse = await fetch(buildApiUrl("/favorites"), { credentials: "same-origin" });
    if (favoriteResponse.ok) {
      const favoriteBody = (await favoriteResponse.json()) as { hotels: Hotel[] };
      setFavorites(favoriteBody.hotels ?? []);
    }
  }, []);

  const login = useCallback((email: string, password: string) =>
    authenticate("/auth/login", { email, password }), [authenticate]);
  const register = useCallback((email: string, password: string, name: string) =>
    authenticate("/auth/register", { email, password, name }), [authenticate]);

  const logout = useCallback(async () => {
    const response = await fetch(buildApiUrl("/auth/logout"), { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error(await responseMessage(response));
    setUser(null);
    setFavorites([]);
  }, []);

  const toggleFavorite = useCallback(async (hotelId: string | number) => {
    if (!user) throw new Error("로그인이 필요합니다.");
    const normalizedId = String(hotelId);
    const isFavorite = favorites.some((hotel) => String(hotel.id) === normalizedId);
    const response = await fetch(buildApiUrl(`/favorites/${encodeURIComponent(normalizedId)}`), {
      method: isFavorite ? "DELETE" : "PUT",
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(await responseMessage(response));
    if (isFavorite) {
      setFavorites((current) => current.filter((hotel) => String(hotel.id) !== normalizedId));
    } else {
      await refreshFavorites();
    }
  }, [favorites, refreshFavorites, user]);

  const favoriteIds = useMemo(() => new Set(favorites.map((hotel) => String(hotel.id))), [favorites]);
  const value = useMemo(() => ({
    user, favorites, favoriteIds, isAuthLoading, login, register, logout, toggleFavorite, refreshFavorites,
  }), [user, favorites, favoriteIds, isAuthLoading, login, register, logout, toggleFavorite, refreshFavorites]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
