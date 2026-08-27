import { useSettingsStore } from "../stores/settingsStore";
import { localize, translate, type TranslationKey } from "./index";

export function useLingua() {
  const locale = useSettingsStore((state) => state.locale);
  return {
    locale,
    l: (zhCN: string, enUS: string) => localize(locale, zhCN, enUS),
    t: (key: TranslationKey) => translate(locale, key)
  };
}
