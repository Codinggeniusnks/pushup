export async function api<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/app', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json.data as T;
}
