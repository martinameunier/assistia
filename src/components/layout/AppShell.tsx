import React, { type ReactNode } from "react";

import type { Language, Translations } from "../../i18n";
import type { AppSection } from "../../types/launcher";
import AppNavigation from "./AppNavigation";
import LanguageSelector from "./LanguageSelector";
import PageHeader from "./PageHeader";

type PageLabels = {
  kicker: string;
  subtitle: string;
  title: string;
};

type Props = {
  activePage: PageLabels;
  activeSection: AppSection;
  children: ReactNode;
  isSidebarCollapsed: boolean;
  labels: Translations;
  language: Language;
  onChangeLanguage: (language: Language) => void;
  onChangeSection: (section: AppSection) => void;
  onOpenDocumentation: () => void;
  onOpenLicense: () => void;
  onOpenPatreon: () => void;
  onToggleSidebar: () => void;
};

export default function AppShell({
  activePage,
  activeSection,
  children,
  isSidebarCollapsed,
  labels,
  language,
  onChangeLanguage,
  onChangeSection,
  onOpenDocumentation,
  onOpenLicense,
  onOpenPatreon,
  onToggleSidebar
}: Props) {

  return (
    <div
      className={
        isSidebarCollapsed
          ? "app-shell app-shell--sidebar-collapsed"
          : "app-shell"
      }
    >
      <AppNavigation
        activeSection={activeSection}
        isCollapsed={isSidebarCollapsed}
        labels={labels}
        onChangeSection={onChangeSection}
        onOpenDocumentation={onOpenDocumentation}
        onOpenLicense={onOpenLicense}
        onOpenPatreon={onOpenPatreon}
        onToggleCollapsed={onToggleSidebar}
      />

      <main className="app-main">
        <LanguageSelector
          labels={labels.language}
          language={language}
          onChange={onChangeLanguage}
        />

        <PageHeader
          kicker={activePage.kicker}
          subtitle={activePage.subtitle}
          title={activePage.title}
        />

        {children}
      </main>
    </div>
  );
}
