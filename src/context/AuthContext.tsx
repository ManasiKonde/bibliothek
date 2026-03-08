import type { User as SupaUser } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { registerForPushNotificationsAsync } from "../lib/pushNotifications";
import { supabase } from "../lib/supabaseClient";

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  location: string | null;
  address_line?: string | null;
  address_city?: string | null;
  address_pincode?: string | null;
};

type AuthContextType = {
  user: User | null;
  initializing: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateLocation: (location: string) => Promise<void>;
  updateAddress: (addressLine: string, city: string, pincode: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(u: SupaUser): User {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  return {
    id: u.id,
    email: u.email ?? null,
    name: (meta?.name as string) ?? null,
    location: (meta?.location as string) ?? null,
    address_line: meta?.address_line != null ? String(meta.address_line) : null,
    address_city: meta?.address_city != null ? String(meta.address_city) : null,
    address_pincode: meta?.address_pincode != null ? String(meta.address_pincode) : null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      const u = data.session?.user;
      setUser(u ? mapUser(u) : null);
      setInitializing(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const u = session?.user;
        setUser(u ? mapUser(u) : null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync(user.id).catch(() => {});
    }
  }, [user?.id]);

  const signup = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          location: "India",
        },
      },
    });

    if (error) return { ok: false, error: error.message };
    const u = data.session?.user ?? data.user;
    if (u) setUser(mapUser(u));
    return { ok: true };
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { ok: false, error: error.message };
    if (data.session?.user) setUser(mapUser(data.session.user));
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateName = async (name: string) => {
    await supabase.auth.updateUser({
      data: { name },
    });
  };

  const updateLocation = async (location: string) => {
    await supabase.auth.updateUser({
      data: { location },
    });
  };

  const updateAddress = async (addressLine: string, city: string, pincode: string) => {
    await supabase.auth.updateUser({
      data: {
        address_line: addressLine.trim(),
        address_city: city.trim(),
        address_pincode: pincode.trim(),
      },
    });
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) setUser(mapUser(data.session.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        signup,
        logout,
        updateName,
        updateLocation,
        updateAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
