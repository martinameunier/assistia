import { developerAgentTranslations } from "./i18n/developerAgent";
import { chatTranslations } from "./i18n/chat";
import { imageGeneratorTranslations } from "./i18n/imageGenerator";
import { installationTranslations } from "./i18n/installation";
import { serviceLaunchTranslations } from "./i18n/serviceLaunch";

export const translations = {
  fr: {
    ...serviceLaunchTranslations.fr,
    ...installationTranslations.fr,
    pages: {
      ...serviceLaunchTranslations.fr.pages,
      ...chatTranslations.fr.pages,
      ...imageGeneratorTranslations.fr.pages,
      ...developerAgentTranslations.fr.pages
    },
    runtime: {
      ...serviceLaunchTranslations.fr.runtime,
      ...chatTranslations.fr.runtime,
      ...installationTranslations.fr.runtime,
      ...imageGeneratorTranslations.fr.runtime,
      ...developerAgentTranslations.fr.runtime
    }
  },
  en: {
    ...serviceLaunchTranslations.en,
    ...installationTranslations.en,
    pages: {
      ...serviceLaunchTranslations.en.pages,
      ...chatTranslations.en.pages,
      ...imageGeneratorTranslations.en.pages,
      ...developerAgentTranslations.en.pages
    },
    runtime: {
      ...serviceLaunchTranslations.en.runtime,
      ...chatTranslations.en.runtime,
      ...installationTranslations.en.runtime,
      ...imageGeneratorTranslations.en.runtime,
      ...developerAgentTranslations.en.runtime
    }
  }
} as const;

export type Language = keyof typeof translations;

type WidenTranslationStrings<T> =
  T extends string
    ? string
    : {
        readonly [Key in keyof T]: WidenTranslationStrings<T[Key]>;
      };

export type Translations =
  WidenTranslationStrings<(typeof translations)[Language]>;
