import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  User,
  setAuthTokenGetter,
  setTokenRefresher,
  setSessionReplacedHandler as setApiSessionReplacedHandler,
} from "@workspace/api-client-react";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  isTokenExpired,
  refreshAccessToken,
  setAuthFailureHandler,
  setSessionReplacedHandler as setStoreSessionReplacedHandler,
} from "@/lib/token-store";
import { publicFetch } from "@/lib/api-fetch";

setAuthTokenGetter(() => localStorage.getItem("token"));
setTokenRefresher(refreshAccessToken);

function redirectSessionReplaced() {
  if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/staff-login")) {
    window.location.href = "/login?session=replaced";
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  isRestoring: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isRestoring, setIsRestoring] = useState(() => {
    const t = getStoredToken();
    return !!t && isTokenExpired(t);
  });

  const logout = useCallback(() => {
    const role = getStoredUser()?.role as string | undefined;
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      publicFetch("/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
    clearSession();
    setToken(null);
    setUser(null);
    const loginPath = role === "superadmin" || role === "admin" || role === "manager" || role === "support"
      ? "/staff-login"
      : "/login";
    if (!window.location.pathname.includes(loginPath)) {
      window.location.href = loginPath;
    }
  }, []);

  useEffect(() => {
    const onSessionReplaced = () => {
      clearSession();
      setToken(null);
      setUser(null);
      redirectSessionReplaced();
    };

    setAuthFailureHandler(() => {
      setToken(null);
      setUser(null);
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?session=expired";
      }
    });
    setStoreSessionReplacedHandler(onSessionReplaced);
    setApiSessionReplacedHandler(onSessionReplaced);

    return () => {
      setAuthFailureHandler(null);
      setStoreSessionReplacedHandler(null);
      setApiSessionReplacedHandler(null);
    };
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsRestoring(false);
      return;
    }

    const storedUser = getStoredUser();
    if (!storedUser) {
      clearSession();
      setToken(null);
      setUser(null);
      setIsRestoring(false);
      return;
    }

    setUser(prev => prev ?? storedUser);
    setToken(stored);

    if (!isTokenExpired(stored)) {
      setIsRestoring(false);
      return;
    }

    const timeout = window.setTimeout(() => setIsRestoring(false), 8000);

    refreshAccessToken().then((newToken) => {
      if (newToken) {
        setToken(newToken);
        setUser(getStoredUser());
      } else {
        logout();
      }
      setIsRestoring(false);
    }).catch(() => {
      logout();
      setIsRestoring(false);
    });

    return () => window.clearTimeout(timeout);
  }, [logout]);

  const login = (newToken: string, newUser: User, refreshToken?: string) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isRestoring }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
