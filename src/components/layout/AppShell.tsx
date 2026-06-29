import React, { type ReactNode } from "react";

import type { Translations } from "../../i18n";
import type { AppSection } from "../../types/launcher";
import AppNavigation from "./AppNavigation";
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
