import { SunMoon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Appearance = "light" | "dark" | "system";

const AppearanceContext = React.createContext<{
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}>({ appearance: "system", setAppearance: () => {} });

export const AppearanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [appearance, setAppearance] = React.useState<Appearance>(() =>
    (document.documentElement.dataset.appearance as Appearance) ?? "system",
  );

  React.useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = appearance === "dark" || (appearance === "system" && system.matches);
      document.documentElement.dataset.appearance = appearance;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#191816" : "#f4f3ef");
    };
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [appearance]);

  const choose = (value: Appearance) => {
    setAppearance(value);
    try {
      localStorage.setItem("pokeroledex-appearance", value);
    } catch {
      // The choice still applies when browser storage is unavailable.
    }
  };

  return <AppearanceContext.Provider value={{ appearance, setAppearance: choose }}>{children}</AppearanceContext.Provider>;
};

export const AppearanceSelect = ({ compact = false }: { compact?: boolean }) => {
  const { appearance, setAppearance } = React.useContext(AppearanceContext);
  return (
    <label
      title={`Appearance: ${appearance}`}
      className={cn(
        "relative flex h-11 items-center gap-2.5 rounded-lg text-body text-label hover:bg-fill focus-within:outline-2 focus-within:outline-focus lg:h-8",
        compact ? "w-11 justify-center lg:w-full" : "px-2.5",
      )}
    >
      <SunMoon aria-hidden className="size-4 shrink-0" />
      <span className="sr-only">Appearance</span>
      <select
        value={appearance}
        onChange={(event) => setAppearance(event.target.value as Appearance)}
        className={compact ? "absolute inset-0 h-full w-full cursor-pointer opacity-0" : "h-full min-w-0 flex-1 cursor-pointer bg-transparent outline-none"}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
};
