import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

type AppFlowContextType = {
  onboardingComplete: boolean;
  onboardingLoading: boolean;
  completeOnboarding: () => Promise<void>;
};

const ONBOARDING_KEY = "onboarding_complete_v1";

const AppFlowContext = React.createContext<AppFlowContextType | undefined>(
  undefined
);

export function AppFlowProvider({ children }: { children: React.ReactNode }) {
  const [onboardingComplete, setOnboardingComplete] = React.useState(false);
  const [onboardingLoading, setOnboardingLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!mounted) return;
        setOnboardingComplete(value === "true");
      } finally {
        if (mounted) setOnboardingLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = React.useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setOnboardingComplete(true);
  }, []);

  return (
    <AppFlowContext.Provider
      value={{ onboardingComplete, onboardingLoading, completeOnboarding }}
    >
      {children}
    </AppFlowContext.Provider>
  );
}

export function useAppFlow() {
  const ctx = React.useContext(AppFlowContext);
  if (!ctx) throw new Error("useAppFlow must be used inside AppFlowProvider");
  return ctx;
}
