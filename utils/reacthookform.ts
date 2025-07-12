import dynamic from "next/dynamic";
export const DevT: React.ElementType = dynamic(
  () => import("@hookform/devtools").then((module) => module.DevTool),
  { ssr: false },
);
