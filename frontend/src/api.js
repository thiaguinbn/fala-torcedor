export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o backend está rodando.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.erro || 'Não foi possível concluir a operação.');
  if (data === null) throw new Error('Resposta inesperada da API. Verifique o backend.');
  return data;
}
export const formatDate = value => value.split('-').reverse().join('/');
export const formatCpf = value => value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
