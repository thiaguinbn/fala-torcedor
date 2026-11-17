export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function parseId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw new HttpError(400, 'Identificador inválido.');
  }
  return Number(value);
}
export function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    if (Number(cpf[tamanho]) !== (resto === 10 ? 0 : resto)) return false;
  }
  return true;
}
function dataValida(value, label) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00Z') : new Date(NaN);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '0001-01-01' || value > new Date().toISOString().slice(0, 10)) {
    throw new HttpError(400, `${label} deve ser uma data válida e não pode estar no futuro.`);
  }
  return value;
}
export function validate(body, tipo) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Envie um objeto JSON.');
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  if (nome.length < 2 || nome.length > 100) throw new HttpError(400, 'O nome deve ter entre 2 e 100 caracteres.');
  if (tipo === 'equipe') {
    if (!['A', 'B', 'C', 'D', 'Sem série'].includes(body.serie)) throw new HttpError(400, 'Escolha uma série válida.');
    return [nome, dataValida(body.data_fundacao, 'A data de fundação'), body.serie];
  }
  const cpf = typeof body.cpf === 'string' ? body.cpf.replace(/[.\-\s]/g, '') : '';
  if (!cpfValido(cpf)) throw new HttpError(400, 'Informe um CPF válido.');
  return [nome, cpf, dataValida(body.data_nascimento, 'A data de nascimento'), parseId(body.equipe_id)];
}
