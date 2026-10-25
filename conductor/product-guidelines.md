# Product Guidelines: new CMDA

## 1. Visual Identity & Design System

The application visual identity strictly mirrors the corporate design system based on Tailwind CSS and Shadcn UI conventions, utilizing OKLCH color spaces with native support for Dark and Light themes.

### Color Tokens (OKLCH)

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.488 0.243 264.376);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.488 0.243 264.376);
  --accent-foreground: oklch(0.97 0.014 254.604);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.45rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.424 0.199 265.638);
  --primary-foreground: oklch(0.97 0.014 254.604);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.424 0.199 265.638);
  --accent-foreground: oklch(0.97 0.014 254.604);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
```

### Typography Hierarchy
- **Headings & Main Titles (`--font-heading`):** Roboto Slab (`serif`), conveying stability and enterprise credibility.
- **Interface & Body Text (`--font-sans`):** Geist Sans (`sans-serif`), clean, high legibility for tables, labels, and form fields.
- **Data, IP Addresses, Technical Identifiers & Logs (`--font-mono`):** Geist Mono (`monospace`), applied to hostnames, IPv4/IPv6, MAC addresses, ping outputs, and terminal data.

## 2. Voice, Tone & Communication
- **Tone:** Technical, concise, operational, and unambiguous.
- **Error Handling:** Always surface the root cause, status code, and concrete recovery suggestion (e.g., "Error de conexión al puerto 1433 del servidor SQL - Verifique conectividad de red").
- **Real-Time Feedback:** Async background operations (ping, remote session launches, SQL queries) must show non-blocking visual indicators (skeleton loaders, spinners, status badges).

## 3. UX & Interaction Principles
- **Density:** Compact, high-information-density dashboard layout designed for IT operators and helpdesk engineers.
- **Keyboard-First:** Full keyboard shortcuts (`Ctrl+F` to search, `Enter` to query, `Esc` to clear, quick action shortcuts for VNC and Ping).
- **Graceful Fallbacks:** Automatic resolution between Hostname and IP; clear visual cue when an asset is unreachable or inactive.
