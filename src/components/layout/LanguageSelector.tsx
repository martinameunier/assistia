import React from "react";

import type { Language, Translations }
from "../../i18n";

type Props = {
  labels: Translations["language"];
  language: Language;
  onChange: (language: Language) => void;
};

export default function LanguageSelector({
  labels,
  language,
  onChange
}: Props) {

  return (
    <div className="app-toolbar">
      <label className="language-select">
        <span>{labels.label}</span>
        <select
          value={language}
          onChange={(event) =>
            onChange(event.target.value as Language)
          }
        >
          <option value="fr">{labels.french}</option>
          <option value="en">{labels.english}</option>
        </select>
      </label>
    </div>
  );
}
