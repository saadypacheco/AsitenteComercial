// Cliente Supabase para el frontend (lectura filtrada por RLS).
//
// SOLO usa la anon key + la sesión del usuario (JWT con app_metadata.tenant_id).
// El SERVICE_ROLE_KEY NUNCA llega al frontend (lección KB): toda escritura pasa
// por el backend FastAPI con service_role. Acá solo se LEE, y RLS filtra por tenant.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falla temprano y claro en dev si falta configuración (no silenciar).
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno del frontend",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
