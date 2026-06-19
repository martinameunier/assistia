import React, {
  useEffect,
  useRef
} from "react";

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
      {logs.join("\n")}
    </pre>
  );
}
