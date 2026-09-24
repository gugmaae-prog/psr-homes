import { permanentRedirect } from "next/navigation";

type Props = { searchParams: Promise<{ q?: string; emirate?: string; developer?: string; type?: string }> };

export default async function PropertiesPage({ searchParams }: Props) {
  const filters = await searchParams;
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.emirate) query.set("emirate", filters.emirate);
  if (filters.developer) query.set("developer", filters.developer);
  if (filters.type) query.set("type", filters.type);
  permanentRedirect(`/projects${query.size ? `?${query}` : ""}`);
}
