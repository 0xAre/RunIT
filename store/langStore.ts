import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'id';

interface LangState {
  lang: Language;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'en', // Default language is English
      toggleLang: () => set((state) => ({ lang: state.lang === 'en' ? 'id' : 'en' })),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'runit-lang-storage',
    }
  )
);
