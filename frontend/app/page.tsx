import { redirect } from "next/navigation";

// La raíz lleva al dashboard ejecutivo "¡Hola Cecilia!" (vista principal).
// El dashboard del día (móvil) sigue disponible en /hoy.
export default function Home() {
  redirect("/inicio");
}
