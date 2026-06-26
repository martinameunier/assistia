import React, {
  useEffect,
  useRef
} from "react";

import LinkifiedText
from "./LinkifiedText";

type Props = {
  logs: string[];
};

export default function LogConsole({
  logs
}: Props) {

  const consoleRef =
    useRef<HTMLPreElement>(null);

  useEffect(() => {
    const consoleElement =
      consoleRef.current;

    if (consoleElement) {
      consoleElement.scrollTop =
        consoleElement.scrollHeight;
    }
  }, [logs]);

  return (

    <pre
      ref={consoleRef}
      className="log-console"
    >
      {logs.map((log, index) => (
        <React.Fragment key={`${log}-${index}`}>
          <LinkifiedText text={log} />
          {index < logs.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </pre>
  );
}
