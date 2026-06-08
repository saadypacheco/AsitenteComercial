import { redirect } from "next/navigation";

// La raíz lleva al dashboard del día (única vista de F-001 por ahora).
export default function Home() {
  redirect("/hoy");
}
