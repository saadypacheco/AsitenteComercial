# frontend — mentorcomercial

Dashboard web (Next.js 14 App Router + TS + Tailwind + Zustand), convención org
(igual que `solucionesdentales`/`tienda`).

## Estado

Scaffold mínimo. El prototipo navegable de referencia (HTML) está en `../mockups/`
y es la base visual a portar a componentes Next.

## Finalizar el scaffold

```bash
# desde frontend/ — completa el andamiaje Next (tsconfig, next.config, tailwind)
npx create-next-app@14 . --ts --tailwind --app --src-dir --import-alias "@/*"
cp .env.example .env.local
npm install
npm run dev
```

## Vistas a portar desde mockups/ (F0/F1)

- `Hoy / ¿Qué pasó hoy?` (resumen + eventos del día)  ← `mockups/dashboard-v5-mi-dia.html`
- Bandeja priorizada (triage 🔴/🟡/⚪)
- Buscador (full-text → luego lenguaje natural)
- Login multi-idioma  ← `mockups/login.html`
