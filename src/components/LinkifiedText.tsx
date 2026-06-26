import React, {
  type ReactNode
} from "react";

import {
  openExternalUrl
} from "../services/tauris";

const urlPattern =
  /\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?]/gi;

type Props = {
  text: string;
};

function openLinkInBrowser(
  event: React.MouseEvent<HTMLAnchorElement>,
  url: string
) {
  event.preventDefault();

  openExternalUrl(url)
    .catch(() => {
      window.open(url, "_blank", "noreferrer");
    });
}

export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const url =
      match[0];
    const index =
      match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }

    nodes.push(
      <a
        key={`${url}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => openLinkInBrowser(event, url)}
      >
        {url}
      </a>
    );

    lastIndex =
      index + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function LinkifiedText({
  text
}: Props) {

  return <>{linkifyText(text)}</>;
}
