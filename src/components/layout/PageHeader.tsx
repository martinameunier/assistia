import React from "react";

type Props = {
  kicker: string;
  subtitle: string;
  title: string;
};

export default function PageHeader({
  kicker,
  subtitle,
  title
}: Props) {

  return (
    <header className="page-header">
      <p>{kicker}</p>
      <h1 id="page-title">{title}</h1>
      <span>{subtitle}</span>
    </header>
  );
}
