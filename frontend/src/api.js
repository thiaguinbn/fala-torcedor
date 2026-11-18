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
export const formatCpf = value => value.replace(/\D/g, '').slice(0, 11)
  .replace(/^(\d{3})(\d)/, '$1.$2')
  .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
  .replace(/\.(\d{3})(\d)/, '.$1-$2');

export function localToday(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function matchesSearch(value, query, cpf = false) {
  const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
  const search = query.trim();
  if (cpf) {
    const digits = search.replace(/\D/g, '');
    return !!digits && /^[\d.\-\s]+$/.test(search) && value.includes(digits);
  }
  return normalize(value).includes(normalize(search));
}
