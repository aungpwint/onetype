import { useSettingsStore } from "../stores/settings-store";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export type Language = "myanmar" | "english";

const LANGUAGE_KEY = "app.language" as const;

interface LanguageToggleProps {
  /** Optional live value; when omitted, the persisted app.language setting drives it. */
  lang?: Language;
  /** Called on change; when omitted, the change is persisted to app.language. */
  onChange?: (lang: Language) => void;
}

/**
 * Reusable language selector (Myanmar / English). By default it reads and writes
 * the persisted `app.language` setting so the choice survives a reload. Pass
 * `lang` / `onChange` to make it fully controlled.
 */
export function LanguageToggle({ lang, onChange }: LanguageToggleProps) {
  const stored = useSettingsStore((s) => s.get(LANGUAGE_KEY));
  const setStored = useSettingsStore((s) => s.set);

  const value = lang ?? (stored === "myanmar" ? "myanmar" : "english");

  const handleChange = (next: "myanmar" | "english") => {
    if (onChange) {
      onChange(next);
      return;
    }
    void setStored(LANGUAGE_KEY, next);
  };

  return (
    <Tabs value={value} onValueChange={(v) => handleChange(v as Language)}>
      <TabsList className="bg-muted">
        <TabsTrigger value="myanmar">
          <span className="ms">မြန်မာ</span>
        </TabsTrigger>
        <TabsTrigger value="english">English</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
