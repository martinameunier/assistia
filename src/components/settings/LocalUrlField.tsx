import React, {
  useId
} from "react";

type Props = {
  disabled: boolean;
  label: string;
  localLabel: string;
  localValue: string;
  placeholder: string;
  useLocalValue: boolean;
  value: string;
  onChange: (value: string) => void;
  onUseLocalValueChange: (value: boolean) => void;
};

export default function LocalUrlField({
  disabled,
  label,
  localLabel,
  localValue,
  placeholder,
  useLocalValue,
  value,
  onChange,
  onUseLocalValueChange
}: Props) {

  const inputId =
    useId();

  function updateUseLocalValue(nextUseLocalValue: boolean) {
    onUseLocalValueChange(nextUseLocalValue);

    if (nextUseLocalValue) {
      onChange(localValue);
    }
  }

  return (
    <div className="settings-url-field">
      <div className="settings-url-field__header">
        <label className="settings-url-field__label" htmlFor={inputId}>
          {label}
        </label>

        <label className="settings-checkbox-field settings-checkbox-field--compact">
          <input
            type="checkbox"
            checked={useLocalValue}
            disabled={disabled}
            onChange={(event) =>
              updateUseLocalValue(event.target.checked)
            }
          />
          <span>{localLabel}</span>
        </label>
      </div>

      <input
        id={inputId}
        type="url"
        value={useLocalValue ? localValue : value}
        disabled={disabled || useLocalValue}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  );
}
