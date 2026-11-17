import { useEffect, useRef, useState } from 'react';
import { Users, Shield, ArrowUpRight, Plus, Search, Pencil, Trash2, X, Trophy, ArrowRight, CircleHelp, LoaderCircle } from 'lucide-react';
import { api, formatCpf, formatDate } from './api';

const emptyFan = { nome: '', cpf: '', data_nascimento: '', equipe_id: '' };
const emptyTeam = { nome: '', data_fundacao: '', serie: 'A' };

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
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialog = useRef(null);
  const isFan = page === 'torcedores';

  async function load() {
    setLoading(true); setLoadError('');
    try {
      const [newFans, newTeams] = await Promise.all([api('/torcedores'), api('/equipes')]);
      setFans(newFans); setTeams(newTeams);
      return true;
    } catch (error) { setLoadError(error.message); return false; }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (modal && !dialog.current.open) dialog.current.showModal();
    if (!modal && dialog.current.open) dialog.current.close();
  }, [modal]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  function navigate(next) { setPage(next); setQuery(''); setFilter(''); setNotice(''); }
  function open(kind, record = null) {
    setForm(record ? { ...record } : { ...(isFan ? emptyFan : emptyTeam) });
    setFormError(''); setModal({ kind, record });
  }
  function close() { if (!saving) { setModal(null); setFormError(''); } }
  function field(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      const suffix = modal.record ? `/${modal.record.id}` : '';
      await api(`/${page}${suffix}`, { method: modal.record ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setModal(null);
      setNotice(`${isFan ? 'Torcedor' : 'Equipe'} ${modal.record ? 'atualizado' : 'cadastrado'} com sucesso.`);
      await load();
    } catch (error) { setFormError(error.message); }
    finally { setSaving(false); }
  }
  async function remove() {
    setSaving(true); setFormError('');
    try {
      await api(`/${page}/${modal.record.id}`, { method: 'DELETE' });
      setModal(null); setNotice(`${isFan ? 'Torcedor excluído' : 'Equipe excluída'} com sucesso.`);
      await load();
    } catch (error) { setFormError(error.message); }
    finally { setSaving(false); }
  }
  const search = query.trim().toLocaleLowerCase('pt-BR');
  const records = (isFan ? fans : teams).filter(item => {
    const matches = item.nome.toLocaleLowerCase('pt-BR').includes(search) || (isFan && (formatCpf(item.cpf).includes(search) || item.cpf.includes(search)));
    return matches && (!filter || String(isFan ? item.equipe_id : item.serie) === filter);
  });
  const activeTeams = teams.filter(team => team.total_torcedores > 0).length;
  const today = new Date().toISOString().slice(0, 10);

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Fala Torcedor, início"><span className="brand-icon"><Trophy size={24}/></span><span>Fala<span className="brand-light">Torcedor</span><small>GESTÃO DA TORCIDA</small></span></a>
      <div className="nav-caption">SEU CLUBE, ORGANIZADO</div>
      <nav aria-label="Navegação principal">
        <button className={isFan ? 'nav-item active' : 'nav-item'} onClick={() => navigate('torcedores')} aria-current={isFan ? 'page' : undefined}><Users size={19}/> Torcedores <span>{fans.length}</span></button>
        <button className={!isFan ? 'nav-item active' : 'nav-item'} onClick={() => navigate('equipes')} aria-current={!isFan ? 'page' : undefined}><Shield size={19}/> Equipes <span>{teams.length}</span></button>
      </nav>
      <div className="sidebar-bottom"><span className="mini-ball">⚽</span><strong>O futebol conecta.<br/>A gente organiza.</strong><p>Cada torcedor faz parte<br/>dessa história.</p><div className="sidebar-line"/><small>FALA TORCEDOR · 2026</small></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>Central de gestão <span className="slash">/</span> <strong>{isFan ? 'Torcedores' : 'Equipes'}</strong></span><span className="workspace-tag"><span/> Espaço da torcida</span></header>
      <main>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow">JUNTOS, DENTRO E FORA DE CAMPO</span><h1>Toda torcida tem<br/>uma história. <em>Organize a sua.</em></h1><p>Conecte torcedores às suas equipes e cuide de cada<br className="desktop-break"/> cadastro em um só lugar.</p><button className="hero-link" onClick={() => navigate(isFan ? 'equipes' : 'torcedores')}>{isFan ? 'Conhecer as equipes' : 'Ver a torcida'} <ArrowUpRight size={17}/></button></div>
          <div className="pitch-art" aria-hidden="true"><div className="pitch"><div className="midline"/><div className="center-circle"/><div className="box box-left"/><div className="box box-right"/><div className="goal goal-left"/><div className="goal goal-right"/></div><span className="pitch-dot dot-one"/><span className="pitch-dot dot-two"/><span className="pitch-dot dot-three"/><div className="art-badge"><Trophy size={21}/><span>A paixão nos une.</span></div></div>
        </section>
        <section className="stats" aria-label="Resumo dos cadastros">
          <div className="stat"><span className="stat-icon"><Users size={21}/></span><div><span>Torcedores cadastrados</span><strong>{loading ? '—' : fans.length.toString().padStart(2, '0')}</strong></div><span className="stat-note">Nossa torcida</span></div>
          <div className="stat"><span className="stat-icon"><Shield size={21}/></span><div><span>Equipes cadastradas</span><strong>{loading ? '—' : teams.length.toString().padStart(2, '0')}</strong></div><span className="stat-note">Em campo</span></div>
          <div className="stat"><span className="stat-icon lime"><Trophy size={21}/></span><div><span>Equipes com torcedores</span><strong>{loading ? '—' : activeTeams.toString().padStart(2, '0')}</strong></div><span className="stat-note">Conexões reais</span></div>
        </section>
        <section className="registry" aria-labelledby="registry-title">
          <div className="section-header"><div><span className="eyebrow dark">QUEM FAZ O FUTEBOL ACONTECER</span><h2 id="registry-title">{isFan ? 'Torcedores' : 'Equipes'} <span>{isFan ? fans.length : teams.length}</span></h2><p>{isFan ? 'Gerencie os torcedores e encontre cada paixão pelo futebol.' : 'Cadastre os clubes que dão identidade à sua torcida.'}</p></div><button className="primary" onClick={() => open('form')} disabled={loading || !!loadError}><Plus size={18}/>{isFan ? 'Novo torcedor' : 'Nova equipe'}</button></div>
          {notice && <div className="success" role="status">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={16}/></button></div>}
          {loadError ? <div className="error-panel" role="alert"><strong>Não foi possível carregar os cadastros.</strong><p>{loadError}</p><button className="secondary" onClick={load}>Tentar novamente</button></div> : <>
          <div className="filters"><label className="search"><Search size={18}/><input aria-label={isFan ? 'Buscar torcedor por nome ou CPF' : 'Buscar equipe por nome'} placeholder={isFan ? 'Buscar por nome ou CPF...' : 'Buscar pelo nome da equipe...'} value={query} onChange={e => setQuery(e.target.value)}/></label><label className="filter-select"><span className="sr-only">{isFan ? 'Filtrar por equipe' : 'Filtrar por série'}</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="">{isFan ? 'Todas as equipes' : 'Todas as séries'}</option>{isFan ? teams.map(team => <option key={team.id} value={team.id}>{team.nome}</option>) : ['A','B','C','D','Sem série'].map(serie => <option key={serie}>{serie}</option>)}</select></label></div>
          <div className="table-scroll"><table><thead><tr><th>{isFan ? 'TORCEDOR' : 'EQUIPE'}</th><th>{isFan ? 'CPF' : 'FUNDAÇÃO'}</th><th>{isFan ? 'NASCIMENTO' : 'SÉRIE'}</th><th>{isFan ? 'EQUIPE DO CORAÇÃO' : 'TORCEDORES'}</th><th className="actions-heading">AÇÕES</th></tr></thead><tbody>
            {loading ? <tr><td colSpan="5" className="empty"><LoaderCircle className="spin" size={24}/> Carregando cadastros...</td></tr> : records.map(record => <tr key={record.id}><td><div className="person"><span className={isFan ? 'avatar' : 'avatar team-avatar'}>{isFan ? record.nome.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase() : <Shield size={20}/>}</span><div><strong>{record.nome}</strong><small>#{String(record.id).padStart(3,'0')}</small></div></div></td><td>{isFan ? formatCpf(record.cpf) : formatDate(record.data_fundacao)}</td><td>{isFan ? formatDate(record.data_nascimento) : <span className="team-pill">{record.serie === 'Sem série' ? 'Sem série' : `Série ${record.serie}`}</span>}</td><td>{isFan ? <span className="team-pill"><Shield size={13}/>{record.equipe_nome}</span> : `${record.total_torcedores} torcedor${record.total_torcedores === 1 ? '' : 'es'}`}</td><td><div className="row-actions"><button aria-label={`Editar ${record.nome}`} title="Editar" onClick={() => open('form', record)}><Pencil size={16}/></button><button className="delete" aria-label={`Excluir ${record.nome}`} title="Excluir" onClick={() => open('delete', record)}><Trash2 size={16}/></button></div></td></tr>)}
          </tbody></table></div>
          {!loading && records.length === 0 && <div className="empty-state"><span className="empty-icon">{isFan ? <Users size={27}/> : <Shield size={27}/>}</span><h3>{query || filter ? 'Nenhum resultado por aqui' : isFan ? 'A torcida começa com o primeiro cadastro' : 'Toda torcida precisa de uma equipe'}</h3><p>{query || filter ? 'Tente outro nome ou ajuste o filtro.' : isFan ? 'Cadastre uma equipe e adicione o primeiro torcedor.' : 'Adicione a primeira equipe para começar.'}</p>{!query && !filter && <button className="secondary" onClick={() => isFan && teams.length === 0 ? navigate('equipes') : open('form')}>{isFan && teams.length === 0 ? 'Cadastrar equipe' : isFan ? 'Cadastrar torcedor' : 'Cadastrar equipe'}<ArrowRight size={16}/></button>}</div>}
          <div className="table-footer"><span>{records.length} {records.length === 1 ? 'registro encontrado' : 'registros encontrados'}</span><span>Uma torcida. Muitas histórias.</span></div></>}
        </section>
        <footer className="page-footer"><span>Fala Torcedor <span>© 2026</span></span><span>Feito para quem vive o futebol.</span></footer>
      </main>
    </div>
    <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) close(); }} aria-labelledby="modal-title">
      {modal && <div className="modal-inner"><div className="modal-top"><span className="modal-symbol">{modal.kind === 'delete' ? <Trash2 size={23}/> : isFan ? <Users size={23}/> : <Shield size={23}/>}</span><button className="icon-button" aria-label="Fechar janela" onClick={close} disabled={saving}><X size={21}/></button></div><h2 id="modal-title">{modal.kind === 'delete' ? `Excluir ${isFan ? 'torcedor' : 'equipe'}?` : `${modal.record ? 'Editar' : isFan ? 'Novo' : 'Nova'} ${isFan ? 'torcedor' : 'equipe'}`}</h2><p className="modal-description">{modal.kind === 'delete' ? `O cadastro de ${modal.record.nome} será removido. Esta ação não pode ser desfeita.` : 'Preencha os dados abaixo. Todos os campos são obrigatórios.'}</p>
      {formError && <div className="form-error" role="alert">{formError}</div>}
      {modal.kind === 'delete' ? <div className="modal-buttons"><button className="secondary" onClick={close} disabled={saving}>Cancelar</button><button className="danger" onClick={remove} disabled={saving}>{saving ? 'Excluindo...' : 'Confirmar exclusão'}</button></div> : <form onSubmit={save}>
        <fieldset disabled={saving}><label>Nome {isFan ? 'completo' : 'da equipe'}<input autoFocus name="nome" value={form.nome} onChange={field} minLength={2} maxLength={100} required placeholder={isFan ? 'Ex.: Maria da Silva' : 'Ex.: Clube Atlético'}/></label>
        {isFan && <label>CPF<input name="cpf" value={form.cpf} onChange={field} maxLength={14} required placeholder="000.000.000-00" inputMode="numeric"/></label>}
        <label>{isFan ? 'Data de nascimento' : 'Data de fundação'}<input type="date" min="0001-01-01" max={today} name={isFan ? 'data_nascimento' : 'data_fundacao'} value={isFan ? form.data_nascimento : form.data_fundacao} onChange={field} required/></label>
        {isFan ? <label>Equipe do coração<select name="equipe_id" value={form.equipe_id} onChange={field} required><option value="">Selecione uma equipe</option>{teams.map(team => <option key={team.id} value={team.id}>{team.nome}</option>)}</select></label> : <label>Série<select name="serie" value={form.serie} onChange={field} required>{['A','B','C','D','Sem série'].map(serie => <option key={serie} value={serie}>{serie === 'Sem série' ? serie : `Série ${serie}`}</option>)}</select></label>}
        {isFan && teams.length === 0 && <p className="form-hint"><CircleHelp size={16}/>Cadastre uma equipe antes de adicionar torcedores.</p>}
        <div className="modal-buttons"><button className="secondary" type="button" onClick={close}>Cancelar</button><button className="primary" disabled={isFan && teams.length === 0} type="submit">{saving ? 'Salvando...' : 'Salvar cadastro'}<ArrowRight size={16}/></button></div></fieldset>
      </form>}</div>}
    </dialog>
  </div>;
}
