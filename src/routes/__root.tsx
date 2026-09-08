import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppErrorComponent } from "@/lib/error-component";
import { Toaster } from "sonner";
import themeCss from "../styles.css?inline";
import appCss from "../styles.css?url";

const APP_NAME = "มาวิน1688";

function stylesheetHref(url: string) {
  if (url.startsWith("/src/")) return "/app.css";
  return url;
}

export const Route = createRootRoute({
  errorComponent: AppErrorComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#c9a44a" },
      {
        name: "description",
        content:
          "มาวิน1688 เว็บตรงหวยออนไลน์ แทงบอล ค่าน้ำ หวยยี่กี หวยรัฐบาล สล็อตเว็บตรง โปรโมชันฝากแรก",
      },
      {
        name: "keywords",
        content:
          "มาวิน1688, เว็บตรง, หวยออนไลน์, แทงบอล, เว็บหวย, เว็บบอล, หวยยี่กี, สล็อตเว็บตรง, ค่าน้ำบอล",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: "/app.css" },
      { rel: "stylesheet", href: stylesheetHref(appCss) },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700&display=swap",
      },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="th" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <style id="mawin-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="bg-navy text-cream">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            className: "font-sans",
            style: {
              background: "#102044",
              border: "1px solid #c9a44a55",
              color: "#faf6ea",
            },
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
