import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "hi" | "ta";

type Dict = Record<string, string>;

const en: Dict = {
  app_name: "MastiGuard",
  tagline: "Bovine mastitis early warning",
  dashboard: "Dashboard",
  animals: "Animals",
  alerts: "Alerts",
  map: "Map",
  data: "Data",
  analytics: "Analytics",
  settings: "Settings",
  herd_risk: "Herd risk overview",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  no_risk: "No Risk",
  anomaly: "Anomaly Detected — Needs Review",
  risk_score: "Risk score",
  search: "Search animals",
  view: "View",
  forecast: "14-day risk forecast",
  factors: "Top contributing factors",
  recommendations: "Decision support",
  sign_in: "Sign in",
  role: "Role",
};

const hi: Dict = {
  app_name: "मैस्टीगार्ड",
  tagline: "गाय-भैंस थनैला पूर्व चेतावनी",
  dashboard: "डैशबोर्ड",
  animals: "पशु",
  alerts: "चेतावनी",
  map: "नक्शा",
  data: "डेटा",
  analytics: "विश्लेषण",
  settings: "सेटिंग्स",
  herd_risk: "झुंड जोखिम अवलोकन",
  high: "उच्च",
  moderate: "मध्यम",
  low: "कम",
  no_risk: "कोई जोखिम नहीं",
  anomaly: "असामान्यता — समीक्षा आवश्यक",
  risk_score: "जोखिम स्कोर",
  search: "पशु खोजें",
  view: "देखें",
  forecast: "14-दिन जोखिम पूर्वानुमान",
  factors: "मुख्य जोखिम कारक",
  recommendations: "सलाह",
  sign_in: "साइन इन",
  role: "भूमिका",
};

const ta: Dict = {
  app_name: "மாஸ்டிகார்ட்",
  tagline: "மடிநோய் முன்னெச்சரிக்கை",
  dashboard: "டாஷ்போர்டு",
  animals: "கால்நடைகள்",
  alerts: "எச்சரிக்கைகள்",
  map: "வரைபடம்",
  data: "தரவு",
  analytics: "பகுப்பாய்வு",
  settings: "அமைப்புகள்",
  herd_risk: "மந்தை ஆபத்து கண்ணோட்டம்",
  high: "அதிக",
  moderate: "மிதமான",
  low: "குறைவு",
  no_risk: "ஆபத்து இல்லை",
  anomaly: "அசாதாரணம் — மறுஆய்வு தேவை",
  risk_score: "ஆபத்து மதிப்பெண்",
  search: "கால்நடைகளைத் தேடு",
  view: "பார்",
  forecast: "14 நாள் ஆபத்து முன்னறிவிப்பு",
  factors: "முக்கிய ஆபத்து காரணிகள்",
  recommendations: "ஆலோசனை",
  sign_in: "உள்நுழை",
  role: "பங்கு",
};

const dicts: Record<Lang, Dict> = { en, hi, ta };

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const value = useMemo(
    () => ({ lang, setLang, t: (k: string) => dicts[lang][k] ?? en[k] ?? k }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
