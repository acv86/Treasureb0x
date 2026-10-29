import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Noto_Sans_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_JP,
  Noto_Sans_SC,
  Nunito_Sans,
} from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Nunito_Sans({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const sc = Noto_Sans_SC({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-sc", preload: false });
const jp = Noto_Sans_JP({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-jp", preload: false });
const arabic = Noto_Sans_Arabic({ weight: ["400", "700"], subsets: ["arabic"], variable: "--font-ar", preload: false });
const hindi = Noto_Sans_Devanagari({
  weight: ["400", "700"],
  subsets: ["devanagari"],
  variable: "--font-hi",
  preload: false,
});
const bengali = Noto_Sans_Bengali({
  weight: ["400", "700"],
  subsets: ["bengali"],
  variable: "--font-bn",
  preload: false,
});

export const metadata: Metadata = {
  title: "Treasureb0x",
  description: "Hunts, clues, and prizes.",
  applicationName: "Treasureb0x",
  appleWebApp: { capable: true, title: "Treasureb0x", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

const boot = `
try {
  var prefs = JSON.parse(localStorage.getItem("tb0x.prefs") || "{}");
  var theme = prefs.theme === "dark" || prefs.theme === "colorful" ? prefs.theme : "light";
  var font = prefs.font === "s" || prefs.font === "l" ? prefs.font : "m";
  var lang = typeof prefs.lang === "string" ? prefs.lang : "en";
  var root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.font = font;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("colorful", theme === "colorful");
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${sc.variable} ${jp.variable} ${arabic.variable} ${hindi.variable} ${bengali.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
