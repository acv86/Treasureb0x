import { english, generateMnemonic, mnemonicToAccount, type HDAccount } from "viem/accounts";

const VAULT_KEY = "tb0x.vault";
const PREFS_KEY = "tb0x.prefs";
const SESSION_KEY = "tb0x.session";
const DEVICE_KEY = "tb0x.device";

export type ThemeName = "light" | "dark" | "colorful";
export type FontSize = "s" | "m" | "l";

export type Prefs = {
  theme: ThemeName;
  font: FontSize;
  lang: string;
};

export type Vault = {
  v: 1;
  address: string;
  displayName: string;
  salt: string;
  iv: string;
  cipher: string;
};

export type Session = {
  address: string;
  displayName: string;
  words: string;
};

const accounts = new Map<string, HDAccount>();

export function normalizeWords(words: string): string {
  return words.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createWords(): string {
  return generateMnemonic(english, 128);
}

export function accountFromWords(words: string): HDAccount {
  const normalized = normalizeWords(words);
  const cached = accounts.get(normalized);
  if (cached) return cached;
  const account = mnemonicToAccount(normalized);
  accounts.set(normalized, account);
  return account;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 80_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function seal(words: string, code: string, displayName: string): Promise<Vault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(normalizeWords(words)),
  );
  return {
    v: 1,
    address: accountFromWords(words).address,
    displayName,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    cipher: bytesToB64(new Uint8Array(cipher)),
  };
}

export async function unseal(vault: Vault, code: string): Promise<string> {
  const key = await deriveKey(code, b64ToBytes(vault.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(vault.iv) as BufferSource },
    key,
    b64ToBytes(vault.cipher) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

export function loadVault(): Vault | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  try {
    const vault = JSON.parse(raw) as Vault;
    if (vault.v !== 1 || !vault.address || !vault.cipher) return null;
    return vault;
  } catch {
    return null;
  }
}

export function saveVault(vault: Vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.words || !session.address) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function loadPrefs(): Prefs {
  const fallback: Prefs = { theme: "light", font: "m", lang: "en" };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
    const theme = raw.theme === "dark" || raw.theme === "colorful" ? raw.theme : "light";
    const font = raw.font === "s" || raw.font === "l" ? raw.font : "m";
    const lang = typeof raw.lang === "string" ? raw.lang : "en";
    return { theme, font, lang };
  } catch {
    return fallback;
  }
}

export function savePrefs(prefs: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme;
  root.dataset.font = prefs.font;
  root.lang = prefs.lang;
  root.dir = prefs.lang === "ar" ? "rtl" : "ltr";
  root.classList.toggle("dark", prefs.theme === "dark");
  root.classList.toggle("colorful", prefs.theme === "colorful");
}
