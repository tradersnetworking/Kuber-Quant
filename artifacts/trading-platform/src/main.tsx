import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";
import "@/lib/i18n";
import { initSentry } from "@/lib/sentry";

initSentry();

const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
if (base) {
  setBaseUrl(base);
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
