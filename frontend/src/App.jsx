import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, LoaderCircle, Pencil, Plus, RefreshCw, Search, Shield, Trash2, Users, X } from 'lucide-react';
import { api, formatCpf, formatDate, localToday, matchesSearch } from './api';

const series = ['A', 'B', 'C', 'D', 'Sem série'];
const emptyFan = { nome: '', cpf: '', data_nascimento: '', equipe_id: '' };
const emptyTeam = { nome: '', data_fundacao: '', serie: 'A' };
const labels = { torcedores: 'Torcedores', equipes: 'Equipes' };

function formValues(entity, record) {
  const fields = entity === 'torcedores' ? emptyFan : emptyTeam;
  return Object.fromEntries(Object.entries(fields).map(([key, fallback]) => {
    const value = String(record?.[key] ?? fallback);
    return [key, key === 'cpf' ? formatCpf(value) : value];
  }));
}

export default function App() {
  const [page, setPage] = useState('torcedores');
  const [fans, setFans] = useState([]);
  const [teams, setTeams] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyFan);
  const [initialForm, setInitialForm] = useState(emptyFan);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const dialog = useRef(null);
  const detailRequest = useRef(0);
  const isFan = page === 'torcedores';
  const modalIsFan = modal?.entity === 'torcedores';
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [newFans, newTeams] = await Promise.all([api('/torcedores'), api('/equipes')]);
      setFans(newFans);
      setTeams(newTeams);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const element = dialog.current;
    if (modal && !element.open) element.showModal();
    if (!modal && element.open) element.close();
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [!!modal]);
  useEffect(() => {
    if (modal) dialog.current.querySelector('[data-initial-focus]')?.focus();
  }, [modal?.kind, modal?.entity, modal?.record?.id, discarding]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  function navigate(next, team = '') {
    setPage(next);
    setQuery('');
    setFilter(String(team));
    setNotice('');
  }

  function open(kind, record = null, entity = page) {
    detailRequest.current++;
    const values = formValues(entity, record);
    setForm(values);
    setInitialForm(values);
    setFormError('');
    setDiscarding(false);
    setModal({ kind, record, entity });
  }

  async function inspect(record) {
    open('details', record);
    const request = detailRequest.current;
    setModal({ kind: 'details', record, entity: page, loading: true });
    try {
      const fresh = await api(`/${page}/${record.id}`);
      if (request === detailRequest.current) setModal({ kind: 'details', record: fresh, entity: page });
    } catch (error) {
      if (request === detailRequest.current) {
        setFormError(error.message);
        setModal({ kind: 'details', record, entity: page, failed: true });
      }
    }
  }

  function close(force = false) {
    if (saving) return;
    if (!force && modal?.kind === 'form' && dirty) {
      setDiscarding(true);
      return;
    }
    detailRequest.current++;
    setModal(null);
    setFormError('');
    setDiscarding(false);
  }

  function create() {
    if (isFan && teams.length === 0) {
      navigate('equipes');
      open('form', null, 'equipes');
      return;
    }
    open('form');
  }

  function field(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: name === 'cpf' ? formatCpf(value.replace(/\D/g, '').slice(0, 11)) : value }));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError('');
    const { entity, record } = modal;
    try {
      await api(`/${entity}${record ? `/${record.id}` : ''}`, {
        method: record ? 'PUT' : 'POST', body: JSON.stringify(form)
      });
      setModal(null);
      setNotice(`${entity === 'torcedores' ? 'Torcedor' : 'Equipe'} ${record ? 'atualizado' : 'cadastrado'} com sucesso.`);
      await load();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (saving) return;
    setSaving(true);
    setFormError('');
    try {
      await api(`/${modal.entity}/${modal.record.id}`, { method: 'DELETE' });
      setModal(null);
      setNotice(`${modalIsFan ? 'Torcedor excluído' : 'Equipe excluída'} com sucesso.`);
      await load();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function viewFans(team) {
    close(true);
    navigate('torcedores', team.id);
  }

  const allRecords = isFan ? fans : teams;
  const records = allRecords.filter(record => matchesSearch(record.nome, query) || (isFan && query.trim() && matchesSearch(record.cpf, query, true)))
    .filter(record => !filter || String(isFan ? record.equipe_id : record.serie) === filter);
  const filtered = !!(query.trim() || filter);
  const blockedDelete = modal?.kind === 'delete' && !modalIsFan && modal.record.total_torcedores > 0;

  return <div className="app-shell">
    <header className="masthead">
      <div className="masthead-inner">
        <img className="company-logo" src="/g4flex.png" alt="G4Flex — integrated solutions" width="177" height="174"/>
        <div className="product-name"><span>Fala Torcedor</span><small>Cadastro de torcedores e equipes</small></div>
        <span className="masthead-label">Gestão de cadastros</span>
      </div>
    </header>

    <div className="navigation-bar"><nav className="navigation" aria-label="Navegação principal">
      <button className={isFan ? 'nav-item active' : 'nav-item'} aria-current={isFan ? 'page' : undefined} onClick={() => navigate('torcedores')}>
        <Users size={18}/> Torcedores <span>{loading || loadError ? '—' : fans.length}</span>
      </button>
      <button className={!isFan ? 'nav-item active' : 'nav-item'} aria-current={!isFan ? 'page' : undefined} onClick={() => navigate('equipes')}>
        <Shield size={18}/> Equipes <span>{loading || loadError ? '—' : teams.length}</span>
      </button>
    </nav></div>

    <main>
      <section className="page-heading" aria-labelledby="registry-title">
        <div><p className="breadcrumb">Cadastros <ChevronRight size={13}/> {labels[page]}</p>
          <h1 id="registry-title">{labels[page]}</h1>
          <p className="page-description">{isFan ? 'Consulte os torcedores, atualize seus dados e organize os vínculos com as equipes.' : 'Mantenha os dados dos clubes e acompanhe os torcedores de cada equipe.'}</p>
        </div>
        <button className="primary" disabled={loading || !!loadError} onClick={create}><Plus size={18}/>{isFan ? teams.length ? 'Novo torcedor' : 'Cadastrar primeira equipe' : 'Nova equipe'}</button>
      </section>

      <div className="notice-slot" role="status">{notice && <div className="success"><Check size={18}/><span>{notice}</span><button className="icon-button" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={18}/></button></div>}</div>

      <section className="registry" aria-label={`Lista de ${page}`} aria-busy={loading}>
        <div className="registry-toolbar">
          <div className="registry-title"><h2>{labels[page]} {isFan ? 'cadastrados' : 'cadastradas'}</h2><span>{loading || loadError ? '—' : allRecords.length}</span></div>
          <button className="text-button" disabled={loading} onClick={load}><RefreshCw size={15} className={loading ? 'spin' : ''}/><span>Atualizar</span></button>
        </div>
        {loadError ? <div className="error-panel" role="alert"><h3>Não foi possível carregar os cadastros</h3><p>{loadError}</p><button className="secondary" onClick={load}>Tentar novamente</button></div> : <>
          <div className="filters">
            <label className="search-label"><span>Buscar {isFan ? 'torcedor' : 'equipe'}</span><div className="search-input"><Search size={18}/><input type="search" placeholder={isFan ? 'Nome ou CPF' : 'Nome da equipe'} value={query} onChange={event => setQuery(event.target.value)}/></div></label>
            <label className="filter-label"><span>{isFan ? 'Equipe' : 'Série'}</span><select value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="">{isFan ? 'Todas as equipes' : 'Todas as séries'}</option>
              {isFan ? teams.map(team => <option key={team.id} value={team.id}>{team.nome}</option>) : series.map(serie => <option key={serie} value={serie}>{serie === 'Sem série' ? serie : `Série ${serie}`}</option>)}
            </select></label>
            {filtered && <button className="text-button clear-filters" onClick={() => { setQuery(''); setFilter(''); }}><X size={15}/>Limpar filtros</button>}
          </div>

          {!loading && !allRecords.length ? <div className="empty-state">
            {isFan ? <Users size={30} strokeWidth={1.5}/> : <Shield size={30} strokeWidth={1.5}/>}
            <h3>{isFan ? 'Nenhum torcedor cadastrado' : 'Nenhuma equipe cadastrada'}</h3>
            <p>{isFan ? teams.length ? 'Adicione um torcedor e selecione sua equipe.' : 'Para começar, cadastre uma equipe. Depois, adicione os torcedores.' : 'Adicione uma equipe com nome, data de fundação e série.'}</p>
            <button className="secondary" onClick={create}><Plus size={17}/>{isFan && teams.length ? 'Cadastrar torcedor' : 'Cadastrar equipe'}</button>
          </div> : <div className="table-scroll"><table>
            <thead><tr><th scope="col">{isFan ? 'Nome' : 'Equipe'}</th><th scope="col">{isFan ? 'CPF' : 'Fundação'}</th><th scope="col">{isFan ? 'Nascimento' : 'Série'}</th><th scope="col">{isFan ? 'Equipe' : 'Torcedores'}</th><th scope="col" className="actions-heading">Ações</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="5" className="table-message"><LoaderCircle size={20} className="spin"/>Carregando cadastros…</td></tr> : !records.length ? <tr><td colSpan="5" className="table-message"><strong>Nenhum resultado encontrado</strong><span>Altere a busca ou limpe os filtros para ver os cadastros.</span><button className="text-button" onClick={() => { setQuery(''); setFilter(''); }}>Limpar filtros</button></td></tr> : records.map(record => <tr key={record.id}>
              <td data-label="Nome" className="name-cell"><button className="record-name" onClick={() => inspect(record)}>{record.nome}<ChevronRight size={15}/></button><span className="record-id">Cadastro #{String(record.id).padStart(3, '0')}</span></td>
              <td data-label={isFan ? 'CPF' : 'Fundação'} className="numeric">{isFan ? formatCpf(record.cpf) : formatDate(record.data_fundacao)}</td>
              <td data-label={isFan ? 'Nascimento' : 'Série'}>{isFan ? <span className="numeric">{formatDate(record.data_nascimento)}</span> : <span className="series-tag">{record.serie === 'Sem série' ? record.serie : `Série ${record.serie}`}</span>}</td>
              <td data-label={isFan ? 'Equipe' : 'Torcedores'}>{isFan ? record.equipe_nome : <button className="count-link" aria-label={`Ver torcedores de ${record.nome}`} onClick={() => viewFans(record)}>{record.total_torcedores} <span>{record.total_torcedores === 1 ? 'torcedor' : 'torcedores'}</span><ArrowRight size={14}/></button>}</td>
              <td className="action-cell"><div className="row-actions"><button className="row-action" aria-label={`Editar ${record.nome}`} onClick={() => open('form', record)}><Pencil size={15}/><span>Editar</span></button><button className="row-action delete" aria-label={`Excluir ${record.nome}`} onClick={() => open('delete', record)}><Trash2 size={15}/><span>Excluir</span></button></div></td>
            </tr>)}</tbody>
          </table></div>}
          <div className="table-footer"><span>{loading ? 'Carregando…' : `${records.length} ${records.length === 1 ? 'registro' : 'registros'}${filtered ? ` de ${allRecords.length}` : ''}`}</span><span>Clique no nome para consultar o cadastro</span></div>
        </>}
      </section>
      <footer className="page-footer"><span>Fala Torcedor</span><span>G4Flex <span aria-hidden="true">/</span> Gestão de cadastros</span></footer>
    </main>

    <dialog ref={dialog} aria-labelledby="modal-title" aria-describedby="modal-description" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }}>
      {modal && <div className="modal-inner">
        <header className="modal-header"><span className="modal-category">{labels[modal.entity]}</span><button className="icon-button" aria-label="Fechar janela" disabled={saving} onClick={() => close()}><X size={21}/></button></header>
        <h2 id="modal-title">{discarding ? 'Descartar alterações?' : modal.kind === 'details' ? 'Dados do cadastro' : modal.kind === 'delete' ? blockedDelete ? 'Equipe com torcedores' : `Excluir ${modalIsFan ? 'torcedor' : 'equipe'}?` : `${modal.record ? 'Editar' : modalIsFan ? 'Novo' : 'Nova'} ${modalIsFan ? 'torcedor' : 'equipe'}`}</h2>
        <p id="modal-description" className="modal-description">{discarding ? 'Os dados que você alterou ainda não foram salvos.' : modal.kind === 'details' ? `Cadastro #${String(modal.record.id).padStart(3, '0')}` : modal.kind === 'delete' ? blockedDelete ? 'Transfira ou exclua os torcedores vinculados antes de excluir esta equipe.' : 'Confira o nome abaixo. A exclusão é permanente.' : 'Todos os campos são obrigatórios.'}</p>
        {discarding ? <div className="modal-buttons"><button className="secondary" data-initial-focus autoFocus onClick={() => setDiscarding(false)}>Continuar editando</button><button className="danger" onClick={() => close(true)}>Descartar alterações</button></div> : <>
          {formError && <div className="form-error" role="alert">{formError}</div>}
          {modal.kind === 'details' ? <>
            {modal.loading ? <p className="detail-loading" role="status"><LoaderCircle size={19} className="spin"/>Carregando cadastro…</p> : !modal.failed && <dl className="record-details">
              <div className="detail-full"><dt>Nome {modalIsFan ? 'completo' : 'da equipe'}</dt><dd>{modal.record.nome}</dd></div>
              {modalIsFan && <div><dt>CPF</dt><dd className="numeric">{formatCpf(modal.record.cpf)}</dd></div>}
              <div><dt>{modalIsFan ? 'Data de nascimento' : 'Data de fundação'}</dt><dd className="numeric">{formatDate(modalIsFan ? modal.record.data_nascimento : modal.record.data_fundacao)}</dd></div>
              <div><dt>{modalIsFan ? 'Equipe' : 'Série'}</dt><dd>{modalIsFan ? modal.record.equipe_nome : modal.record.serie === 'Sem série' ? 'Sem série' : `Série ${modal.record.serie}`}</dd></div>
              {!modalIsFan && <div><dt>Torcedores vinculados</dt><dd>{modal.record.total_torcedores}</dd></div>}
            </dl>}
            <div className="modal-buttons"><button className="secondary" onClick={() => close()}>Fechar</button><button className="primary" disabled={modal.loading || modal.failed} onClick={() => open('form', modal.record, modal.entity)}><Pencil size={16}/>Editar cadastro</button></div>
          </> : modal.kind === 'delete' ? <>
            <div className="delete-record"><strong>{modal.record.nome}</strong><span>{modalIsFan ? formatCpf(modal.record.cpf) : `${modal.record.total_torcedores} torcedores vinculados`}</span></div>
            <div className="modal-buttons"><button className="secondary" data-initial-focus autoFocus disabled={saving} onClick={() => close()}>Cancelar</button>{blockedDelete ? <button className="primary" onClick={() => viewFans(modal.record)}>Ver torcedores<ArrowRight size={16}/></button> : <button className="danger" disabled={saving} onClick={remove}>{saving ? 'Excluindo…' : 'Confirmar exclusão'}</button>}</div>
          </> : <form onSubmit={save}>
            <fieldset disabled={saving}>
              <label>Nome {modalIsFan ? 'completo' : 'da equipe'}<input data-initial-focus autoFocus name="nome" autoComplete={modalIsFan ? 'name' : 'off'} value={form.nome} onChange={field} minLength={2} maxLength={100} required/></label>
              {modalIsFan && <label><span id="cpf-label">CPF</span><input name="cpf" aria-labelledby="cpf-label" value={form.cpf} onChange={field} maxLength={14} required inputMode="numeric" placeholder="000.000.000-00" aria-describedby="cpf-hint"/><small id="cpf-hint">Informe os 11 dígitos do CPF.</small></label>}
              <div className={modalIsFan ? '' : 'form-columns'}>
                <label>{modalIsFan ? 'Data de nascimento' : 'Data de fundação'}<input type="date" min="0001-01-01" max={localToday()} name={modalIsFan ? 'data_nascimento' : 'data_fundacao'} value={modalIsFan ? form.data_nascimento : form.data_fundacao} onChange={field} required/></label>
                {modalIsFan ? <label>Equipe<select name="equipe_id" value={form.equipe_id} onChange={field} required><option value="">Selecione uma equipe</option>{teams.map(team => <option key={team.id} value={team.id}>{team.nome}</option>)}</select></label> : <label>Série<select name="serie" value={form.serie} onChange={field} required>{series.map(serie => <option key={serie} value={serie}>{serie === 'Sem série' ? serie : `Série ${serie}`}</option>)}</select></label>}
              </div>
              <div className="modal-buttons"><button className="secondary" type="button" onClick={() => close()}>Cancelar</button><button className="primary" type="submit">{saving ? <><LoaderCircle size={17} className="spin"/>Salvando…</> : modal.record ? 'Salvar alterações' : modalIsFan ? 'Cadastrar torcedor' : 'Cadastrar equipe'}</button></div>
            </fieldset>
          </form>}
        </>}
      </div>}
    </dialog>
  </div>;
}
