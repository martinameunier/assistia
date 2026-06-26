import React from "react";

import {
  BookOpenText,
  Code,
  FileText,
  Image,
  Menu,
  MessageSquareText,
  Scale,
  Settings
} from "lucide-react";

import type { Translations } from "../../i18n";
import type { AppSection } from "../../types/launcher";
import PatreonLogo from "../PatreonLogo";

type Props = {
  activeSection: AppSection;
  isCollapsed: boolean;
  labels: Pick<Translations, "actions" | "navigation">;
  onChangeSection: (section: AppSection) => void;
  onOpenDocumentation: () => void;
  onOpenLicense: () => void;
  onOpenPatreon: () => void;
  onToggleCollapsed: () => void;
};

const navigationItems: Array<{
  icon: typeof MessageSquareText;
  section: AppSection;
  titleKey: keyof Translations["navigation"];
}> = [
  {
    icon: MessageSquareText,
    section: "chat",
    titleKey: "chat"
  },
  {
    icon: Image,
    section: "image-generator",
    titleKey: "imageGenerator"
  },
  {
    icon: Code,
    section: "developer-agent",
    titleKey: "developerAgent"
  },
  {
    icon: Settings,
    section: "settings",
    titleKey: "settings"
  }
];

export default function AppNavigation({
  activeSection,
  isCollapsed,
  labels,
  onChangeSection,
  onOpenDocumentation,
  onOpenLicense,
  onOpenPatreon,
  onToggleCollapsed
}: Props) {

  const sidebarToggleLabel =
    isCollapsed
      ? labels.navigation.expand
      : labels.navigation.collapse;

  function sectionButtonClass(section: AppSection) {

    return activeSection === section
      ? "app-nav__button app-nav__button--active"
      : "app-nav__button";
  }

  return (
    <aside className="app-sidebar" aria-label={labels.navigation.ariaLabel}>
      <div className="app-sidebar__header">
        <div className="app-sidebar__brand">
          <span className="app-sidebar__mark">A</span>
          <span className="app-sidebar__brand-text">Assistia</span>
        </div>

        <button
          type="button"
          className="app-sidebar__toggle"
          onClick={onToggleCollapsed}
          aria-label={sidebarToggleLabel}
          title={sidebarToggleLabel}
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="app-nav">
        {navigationItems.map((item) => {
          const Icon =
            item.icon;
          const title =
            labels.navigation[item.titleKey];

          return (
            <button
              key={item.section}
              type="button"
              className={sectionButtonClass(item.section)}
              onClick={() => onChangeSection(item.section)}
              aria-current={activeSection === item.section ? "page" : undefined}
              title={title}
            >
              <Icon size={20} />
              <span>{title}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="app-nav__button"
          onClick={onOpenDocumentation}
          title={labels.navigation.documentation}
        >
          <BookOpenText size={20} />
          <span>{labels.navigation.documentation}</span>
        </button>

        <button
          type="button"
          className="app-nav__button"
          onClick={onOpenLicense}
          title={labels.navigation.license}
        >
          <Scale size={20} />
          <span>{labels.navigation.license}</span>
        </button>

        <button
          type="button"
          className={sectionButtonClass("logs")}
          onClick={() => onChangeSection("logs")}
          aria-current={activeSection === "logs" ? "page" : undefined}
          title={labels.navigation.logs}
        >
          <FileText size={20} />
          <span>{labels.navigation.logs}</span>
        </button>

        <button
          type="button"
          className="app-nav__button app-nav__button--patreon"
          onClick={onOpenPatreon}
          title={labels.actions.patreon}
        >
          <PatreonLogo />
          <span>{labels.actions.patreon}</span>
        </button>
      </nav>
    </aside>
  );
}
