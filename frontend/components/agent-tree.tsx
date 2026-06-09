"use client";

// Árbol de jerarquía de agentes (por superior_id). Construye el árbol desde la lista
// plana y lo renderiza recursivamente con líneas de conexión.
import { Avatar, Badge } from "@/components/executive";
import type { Agente } from "@/lib/queries/gestion";

type Node = Agente & { children: Node[] };

function buildTree(items: Agente[]): Node[] {
  const byId = new Map<string, Node>(items.map((a) => [a.id, { ...a, children: [] }]));
  const roots: Node[] = [];
  byId.forEach((n) => {
    const parent = n.superior_id ? byId.get(n.superior_id) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  });
  return roots;
}

type Labels = { activo: string; inactivo: string; saturada: string };

function NodeRow({ node, labels }: { node: Node; labels: Labels }) {
  return (
    <li>
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-soft">
        <Avatar name={`${node.nombre} ${node.apellido ?? ""}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{node.nombre} {node.apellido ?? ""}</p>
          <p className="truncate text-xs text-muted">{node.ciudad}{node.children.length > 0 ? ` · ${node.children.length}` : ""}</p>
        </div>
        <span className="ml-2 flex items-center gap-1.5">
          <Badge tone={node.estado === "activo" ? "ok" : "warning"}>{node.estado === "activo" ? labels.activo : labels.inactivo}</Badge>
          {node.abiertas >= 3 && <Badge tone="danger">{labels.saturada}</Badge>}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-5 mt-1 space-y-1 border-l border-line pl-3">
          {node.children.map((ch) => <NodeRow key={ch.id} node={ch} labels={labels} />)}
        </ul>
      )}
    </li>
  );
}

export function AgentTree({ agentes, labels }: { agentes: Agente[]; labels: Labels }) {
  const roots = buildTree(agentes);
  return (
    <ul className="space-y-1">
      {roots.map((r) => <NodeRow key={r.id} node={r} labels={labels} />)}
      {roots.length === 0 && <li className="text-sm text-muted">—</li>}
    </ul>
  );
}
