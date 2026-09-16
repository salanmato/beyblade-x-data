import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const FORMATOS = [
  { id: 'mata_mata', label: 'Mata-Mata' },
  { id: 'rodadas', label: 'Suíço / Rodadas' },
  { id: 'grupos_mata_mata', label: 'Grupos + Mata-Mata' }
];

const METAS_PONTOS = [4, 5, 7];
const ORDENS = ['Lado X', 'Lado B'];

const FINALIZACOES = [
  { label: 'Spin Finish (+1p)', value: 'Spin Finish', pontos: 1, activeClass: 'active-blue' },
  { label: 'Over Finish (+2p)', value: 'Over Finish', pontos: 2, activeClass: 'active-yellow' },
  { label: 'Burst Finish (+2p)', value: 'Burst Finish', pontos: 2, activeClass: 'active-pink' },
  { label: 'Xtreme Finish (+3p)', value: 'Xtreme Finish', pontos: 3, activeClass: 'active-red' }
];

export default function MatchForm() {
  const campeonatoAtivo = useLiveQuery(
    () => db.campeonatos.where('status').equals('ativo').first(),
    []
  );

  // Estados de Fluxo
  const [configurandoPartida, setConfigurandoPartida] = useState(false);
  const [partidaAtiva, setPartidaAtiva] = useState(null);
  const [configurandoTorneio, setConfigurandoTorneio] = useState(false);
  const [aviso, setAviso] = useState(null);

  // Configuração do Novo Torneio
  const [formatoTorneio, setFormatoTorneio] = useState('mata_mata');
  const [pontosMetaTorneio, setPontosMetaTorneio] = useState(4);
  const [beysIniciais, setBeysIniciais] = useState(['', '', '']);

  // Gestão de Beys dentro do Torneio Ativo
  const [gerenciandoDeck, setGerenciandoDeck] = useState(false);
  const [novaBeyDeck, setNovaBeyDeck] = useState('');

  // Setup do Confronto (Partida)
  const [meuCombo, setMeuCombo] = useState('');
  const [metaPontosPartida, setMetaPontosPartida] = useState(4);
  const [ladoPartida, setLadoPartida] = useState('Lado X');

  // Registro da Rodada Atual (dentro da partida)
  const [comboAdvRodada, setComboAdvRodada] = useState('');
  const [vencedorRodada, setVencedorRodada] = useState('meu'); // 'meu' | 'adv' | 'empate'
  const [finalizacaoRodada, setFinalizacaoRodada] = useState('Spin Finish');

  const [salvando, setSalvando] = useState(false);

  // Iniciar Torneio
  const handleCriarCampeonato = async () => {
    const faseInicial = formatoTorneio === 'grupos_mata_mata' ? 'grupos' : formatoTorneio;
    const beysFiltradas = beysIniciais.map((b) => b.trim()).filter(Boolean);

    await db.campeonatos.add({
      formato: formatoTorneio,
      fase_atual: faseInicial,
      pontos_vitoria: pontosMetaTorneio,
      status: 'ativo',
      data_inicio: new Date().toISOString(),
      data_fim: null,
      vitorias: 0,
      derrotas: 0,
      total_partidas: 0,
      beys: beysFiltradas
    });

    setBeysIniciais(['', '', '']);
    setConfigurandoTorneio(false);
    setAviso(
      `Campeonato iniciado (${pontosMetaTorneio} pts para vitória)${
        beysFiltradas.length > 0 ? ` com ${beysFiltradas.length} Beys cadastradas` : ''
      }.`
    );
  };

  // Adicionar Bey ao Deck do Torneio Ativo
  const handleAdicionarBeyDeck = async (e) => {
    e.preventDefault();
    if (!novaBeyDeck.trim() || !campeonatoAtivo) return;
    const atuais = campeonatoAtivo.beys || [];
    await db.campeonatos.update(campeonatoAtivo.id, {
      beys: [...atuais, novaBeyDeck.trim()]
    });
    setNovaBeyDeck('');
  };

  // Remover Bey do Deck do Torneio Ativo
  const handleRemoverBeyDeck = async (indexParaRemover) => {
    if (!campeonatoAtivo) return;
    const atuais = campeonatoAtivo.beys || [];
    const atualizadas = atuais.filter((_, idx) => idx !== indexParaRemover);
    await db.campeonatos.update(campeonatoAtivo.id, {
      beys: atualizadas
    });
  };

  // Avançar para Playoffs
  const handleAvancarPlayoffs = async () => {
    if (!campeonatoAtivo) return;
    if (window.confirm('Avançar para os Playoffs (Mata-Mata)? Cada derrota na partida agora elimina.')) {
      await db.campeonatos.update(campeonatoAtivo.id, {
        fase_atual: 'mata_mata'
      });
      setAviso('Fase de Mata-Mata iniciada!');
    }
  };

  // Declarar Campeão
  const handleDeclararCampeao = async () => {
    if (!campeonatoAtivo) return;
    if (window.confirm('Confirmar vitória na final do torneio?')) {
      await db.campeonatos.update(campeonatoAtivo.id, {
        status: 'campeao',
        data_fim: new Date().toISOString()
      });
      setAviso(`CAMPEÃO DO TORNEIO! (${campeonatoAtivo.vitorias}V - ${campeonatoAtivo.derrotas}D)`);
    }
  };

  // Finalizar Torneio de Rodadas
  const handleFinalizarRodadas = async () => {
    if (!campeonatoAtivo) return;
    if (window.confirm('Finalizar torneio e salvar a campanha?')) {
      await db.campeonatos.update(campeonatoAtivo.id, {
        status: 'finalizado',
        data_fim: new Date().toISOString()
      });
      setAviso(`Torneio concluído: ${campeonatoAtivo.vitorias}V - ${campeonatoAtivo.derrotas}D.`);
    }
  };

  // Desistir do Torneio
  const handleAbandonar = async () => {
    if (!campeonatoAtivo) return;
    if (window.confirm('Deseja desistir / encerrar o campeonato atual?')) {
      await db.campeonatos.update(campeonatoAtivo.id, {
        status: 'eliminado',
        data_fim: new Date().toISOString()
      });
      setAviso(`Torneio encerrado (${campeonatoAtivo.vitorias}V - ${campeonatoAtivo.derrotas}D).`);
    }
  };

  // 1. Abrir tela de setup da partida ao clicar em "Iniciar Partida"
  const handleAbrirSetupPartida = () => {
    const meta = campeonatoAtivo?.pontos_vitoria || 4;
    setMetaPontosPartida(meta);
    if (campeonatoAtivo?.beys && campeonatoAtivo.beys.length > 0 && !meuCombo) {
      setMeuCombo(campeonatoAtivo.beys[0]);
    }
    setConfigurandoPartida(true);
  };

  // 2. Começar a disputa com placar 0 x 0
  const handleComecarDisputa = (e) => {
    e.preventDefault();
    setPartidaAtiva({
      meuCombo: meuCombo.trim() || 'Meu Beyblade',
      comboAdv: 'Adversário',
      lado: ladoPartida,
      metaPontos: metaPontosPartida,
      placarMeu: 0,
      placarAdv: 0,
      rodadas: []
    });
    setComboAdvRodada('');
    setConfigurandoPartida(false);
  };

  // 3. Registrar um lançamento / rodada dentro da partida
  const handleRegistrarRodada = (e) => {
    e.preventDefault();
    if (!partidaAtiva) return;

    const finInfo = FINALIZACOES.find((f) => f.value === finalizacaoRodada) || FINALIZACOES[0];
    const pts = vencedorRodada === 'empate' ? 0 : finInfo.pontos;

    const novoMeuPlacar =
      partidaAtiva.placarMeu + (vencedorRodada === 'meu' ? pts : 0);
    const novoAdvPlacar =
      partidaAtiva.placarAdv + (vencedorRodada === 'adv' ? pts : 0);

    const comboAdvAtual =
      comboAdvRodada.trim() ||
      (partidaAtiva.comboAdv !== 'Adversário' ? partidaAtiva.comboAdv : 'Adversário');

    const novaRodada = {
      numero: partidaAtiva.rodadas.length + 1,
      vencedor: vencedorRodada,
      finalizacao: vencedorRodada === 'empate' ? 'Empate' : finInfo.value,
      pontos: pts,
      lado: partidaAtiva.lado,
      meuCombo: partidaAtiva.meuCombo,
      comboAdv: comboAdvAtual,
      placarApos: `${novoMeuPlacar} x ${novoAdvPlacar}`
    };

    setPartidaAtiva({
      ...partidaAtiva,
      comboAdv: comboAdvAtual,
      placarMeu: novoMeuPlacar,
      placarAdv: novoAdvPlacar,
      rodadas: [...partidaAtiva.rodadas, novaRodada]
    });
  };

  // Desfazer última rodada da partida
  const handleDesfazerUltimaRodada = () => {
    if (!partidaAtiva || partidaAtiva.rodadas.length === 0) return;
    const ultimas = [...partidaAtiva.rodadas];
    const removida = ultimas.pop();

    let recuoMeu = partidaAtiva.placarMeu;
    let recuoAdv = partidaAtiva.placarAdv;

    if (removida.vencedor === 'meu') recuoMeu -= removida.pontos;
    if (removida.vencedor === 'adv') recuoAdv -= removida.pontos;

    // Restaura o combo do adversário da rodada anterior (se houver)
    const comboAnterior =
      ultimas.length > 0 ? ultimas[ultimas.length - 1].comboAdv : 'Adversário';

    setPartidaAtiva({
      ...partidaAtiva,
      comboAdv: comboAnterior,
      placarMeu: Math.max(0, recuoMeu),
      placarAdv: Math.max(0, recuoAdv),
      rodadas: ultimas
    });
  };

  // Concluir e salvar a Partida finalizada no Dexie
  const handleConcluirPartida = async () => {
    if (!partidaAtiva) return;
    setSalvando(true);

    try {
      const isChamp = Boolean(campeonatoAtivo);
      const champId = isChamp ? campeonatoAtivo.id : null;
      const faseAtual = isChamp ? campeonatoAtivo.fase_atual : null;

      const resultadoFinal =
        partidaAtiva.placarMeu > partidaAtiva.placarAdv
          ? 'Vitória'
          : partidaAtiva.placarMeu < partidaAtiva.placarAdv
          ? 'Derrota'
          : 'Empate';

      // Resumo dos combos do adversário enfrentados nas rodadas
      const combosAdvUnicos = Array.from(
        new Set(
          partidaAtiva.rodadas
            .map((r) => r.comboAdv)
            .filter((c) => c && c !== 'Adversário')
        )
      );
      const resumoComboAdv =
        combosAdvUnicos.length > 0
          ? combosAdvUnicos.join(', ')
          : partidaAtiva.comboAdv;

      // Salva partida completa com array de rodadas
      await db.partidas.add({
        contexto: isChamp ? 'Campeonato' : 'Casual',
        meu_combo: partidaAtiva.meuCombo,
        combo_adv: resumoComboAdv,
        ordem: partidaAtiva.lado,
        placar_meu: partidaAtiva.placarMeu,
        placar_adv: partidaAtiva.placarAdv,
        resultado: resultadoFinal,
        campeonato_id: champId,
        fase_campeonato: faseAtual,
        rodadas: partidaAtiva.rodadas,
        data: new Date().toISOString()
      });

      if (isChamp) {
        const vits = (campeonatoAtivo.vitorias || 0) + (resultadoFinal === 'Vitória' ? 1 : 0);
        const ders = (campeonatoAtivo.derrotas || 0) + (resultadoFinal === 'Derrota' ? 1 : 0);
        const total = (campeonatoAtivo.total_partidas || 0) + 1;

        const emMataMata =
          campeonatoAtivo.formato === 'mata_mata' || campeonatoAtivo.fase_atual === 'mata_mata';

        if (resultadoFinal === 'Derrota' && emMataMata) {
          // Derrota na partida encerra a campanha no mata-mata
          await db.campeonatos.update(champId, {
            vitorias: vits,
            derrotas: ders,
            total_partidas: total,
            status: 'eliminado',
            data_fim: new Date().toISOString()
          });
          setAviso(`Eliminado do Mata-Mata com ${vits} vitória(s) em partidas.`);
        } else {
          await db.campeonatos.update(champId, {
            vitorias: vits,
            derrotas: ders,
            total_partidas: total
          });
          setAviso(`Partida registrada: ${resultadoFinal} (${partidaAtiva.placarMeu} x ${partidaAtiva.placarAdv}).`);
        }
      } else {
        setAviso(`Partida registrada: ${resultadoFinal} (${partidaAtiva.placarMeu} x ${partidaAtiva.placarAdv}).`);
      }

      setComboAdvRodada('');
      setPartidaAtiva(null);
    } catch (error) {
      console.error('Erro ao salvar partida:', error);
    } finally {
      setSalvando(false);
    }
  };

  const getFormatoLabel = (f) => {
    if (f === 'mata_mata') return 'Mata-Mata';
    if (f === 'rodadas') return 'Suíço / Rodadas';
    if (f === 'grupos_mata_mata') return 'Grupos + Mata-Mata';
    return f;
  };

  const emMataMata =
    campeonatoAtivo &&
    (campeonatoAtivo.formato === 'mata_mata' || campeonatoAtivo.fase_atual === 'mata_mata');

  // Checa se a meta de pontos da partida foi batida
  const partidaFinalizada =
    partidaAtiva &&
    (partidaAtiva.placarMeu >= partidaAtiva.metaPontos ||
      partidaAtiva.placarAdv >= partidaAtiva.metaPontos);

  return (
    <div style={{ width: '100%' }}>
      {/* 1. TELA INICIAL LIMPA */}
      {!partidaAtiva && !configurandoPartida && !configurandoTorneio && (
        <div style={{ width: '100%', padding: '16px 0' }}>
          <h2>{campeonatoAtivo ? 'Campeonato em Andamento' : 'Partida Rápida'}</h2>

          {/* Notificação limpa */}
          {aviso && (
            <div className="project-div" style={{ marginBottom: '16px' }}>
              <div className="project-status" style={{ color: 'var(--yellow)', fontSize: '1.2rem' }}>
                {aviso}
              </div>
              <button
                type="button"
                className="link"
                style={{ fontSize: '1rem', marginTop: '4px' }}
                onClick={() => setAviso(null)}
              >
                [fechar]
              </button>
            </div>
          )}

          {/* Status do Campeonato Ativo */}
          {campeonatoAtivo ? (
            <div
              className="project-div"
              style={{
                borderBottom: '1px dashed rgba(255, 255, 255, 0.25)',
                paddingBottom: '16px',
                marginBottom: '24px'
              }}
            >
              <div className="project-status" style={{ color: 'var(--yellow)', fontStyle: 'normal' }}>
                {getFormatoLabel(campeonatoAtivo.formato)} • {campeonatoAtivo.vitorias || 0}V -{' '}
                {campeonatoAtivo.derrotas || 0}D (Partidas)
              </div>

              <div className="project-description" style={{ fontSize: '1.2rem', margin: '6px 0 12px' }}>
                {campeonatoAtivo.pontos_vitoria ? `Meta da partida: ${campeonatoAtivo.pontos_vitoria} pts ` : ''}
                {campeonatoAtivo.fase_atual === 'grupos'
                  ? '• Fase de Grupos'
                  : emMataMata
                  ? '• Mata-Mata Eliminatório'
                  : ''}
              </div>

              {/* Deck de Beys Pré-Cadastradas no Torneio */}
              <div
                style={{
                  margin: '12px 0 16px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="project-status" style={{ fontSize: '1.1rem', color: 'var(--yellow)', margin: 0 }}>
                    Deck de Beys ({campeonatoAtivo.beys?.length || 0})
                  </span>
                  <button
                    type="button"
                    className="link"
                    style={{ fontSize: '1rem' }}
                    onClick={() => setGerenciandoDeck(!gerenciandoDeck)}
                  >
                    {gerenciandoDeck ? '[Fechar]' : '[Gerenciar Beys]'}
                  </button>
                </div>

                {/* Lista das Beys Cadastradas */}
                {campeonatoAtivo.beys && campeonatoAtivo.beys.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {campeonatoAtivo.beys.map((bey, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '1.1rem'
                        }}
                      >
                        <span style={{ color: 'var(--green)', fontFamily: 'Oxanium' }}>#{idx + 1}</span>
                        <span>{bey}</span>
                        {gerenciandoDeck && (
                          <button
                            type="button"
                            className="link"
                            style={{ color: 'var(--red)', fontSize: '0.95rem', marginLeft: '4px' }}
                            onClick={() => handleRemoverBeyDeck(idx)}
                          >
                            [x]
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="project-description" style={{ fontSize: '1.1rem', margin: '8px 0 0', opacity: 0.7 }}>
                    Nenhuma Bey pré-cadastrada no torneio. Clique em [Gerenciar Beys] para adicionar seu deck.
                  </p>
                )}

                {/* Form para adicionar nova Bey */}
                {gerenciandoDeck && (
                  <form onSubmit={handleAdicionarBeyDeck} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input
                      type="text"
                      value={novaBeyDeck}
                      onChange={(e) => setNovaBeyDeck(e.target.value)}
                      placeholder="Ex: Phoenix Wing 9-60B"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="quick-btn active-green"
                      style={{ padding: '0 16px', fontSize: '1rem', whiteSpace: 'nowrap' }}
                    >
                      + Adicionar
                    </button>
                  </form>
                )}
              </div>

              <div className="project-links" style={{ fontSize: '1.1rem', gap: '14px' }}>
                {campeonatoAtivo.formato === 'grupos_mata_mata' &&
                  campeonatoAtivo.fase_atual === 'grupos' && (
                    <button type="button" className="link" onClick={handleAvancarPlayoffs}>
                      Ir para o Mata-Mata
                    </button>
                  )}

                {emMataMata && (
                  <button type="button" className="link" onClick={handleDeclararCampeao}>
                    Declarar Campeão
                  </button>
                )}

                {campeonatoAtivo.formato === 'rodadas' && (
                  <button type="button" className="link" onClick={handleFinalizarRodadas}>
                    Finalizar Torneio
                  </button>
                )}

                <button
                  type="button"
                  className="link"
                  style={{ color: 'var(--red)' }}
                  onClick={handleAbandonar}
                >
                  Desistir
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <p className="project-status" style={{ color: 'var(--blue)', marginBottom: '4px' }}>
                Modo Casual
              </p>
              <p className="project-description" style={{ fontSize: '1.2rem' }}>
                Partidas completas disputadas por pontos (Spin, Over, Burst, Xtreme).
              </p>
            </div>
          )}

          {/* O BOTÃO CENTRAL LIMPO */}
          <button
            type="button"
            className="btn-submit-custom"
            style={{ maxWidth: '340px' }}
            onClick={handleAbrirSetupPartida}
          >
            Iniciar Partida
          </button>

          {!campeonatoAtivo && (
            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="link"
                style={{ color: 'var(--yellow)', fontSize: '1.2rem' }}
                onClick={() => setConfigurandoTorneio(true)}
              >
                Criar / Iniciar Campeonato
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. SETUP DO TORNEIO (QUANDO SOLICITADO) */}
      {configurandoTorneio && (
        <div style={{ width: '100%', padding: '10px 0' }}>
          <h2>Novo Campeonato</h2>

          <div className="form-group-custom">
            <label className="project-status">Formato do Campeonato</label>
            <div className="quick-btn-container">
              {FORMATOS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`quick-btn ${formatoTorneio === f.id ? 'active-yellow' : ''}`}
                  onClick={() => setFormatoTorneio(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group-custom">
            <label className="project-status">Pontos para Vencer a Partida</label>
            <div className="quick-btn-container">
              {METAS_PONTOS.map((pts) => (
                <button
                  key={pts}
                  type="button"
                  className={`quick-btn ${pontosMetaTorneio === pts ? 'active-green' : ''}`}
                  onClick={() => setPontosMetaTorneio(pts)}
                >
                  {pts} Pontos
                </button>
              ))}
            </div>
          </div>

          <div className="form-group-custom">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="project-status" style={{ margin: 0 }}>
                Deck de Beys ({beysIniciais.length} slots)
              </label>
              <button
                type="button"
                className="link"
                style={{ fontSize: '1rem', color: 'var(--green)' }}
                onClick={() => setBeysIniciais([...beysIniciais, ''])}
              >
                + Adicionar Bey
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {beysIniciais.map((b, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={b}
                    onChange={(e) => {
                      const novos = [...beysIniciais];
                      novos[idx] = e.target.value;
                      setBeysIniciais(novos);
                    }}
                    placeholder={`Bey #${idx + 1} (ex: ${
                      idx === 0
                        ? 'Phoenix Wing 9-60B'
                        : idx === 1
                        ? 'Wizard Rod 5-70B'
                        : idx === 2
                        ? 'Dran Buster 1-60A'
                        : 'Unicorn Sting 5-60GP'
                    })`}
                    style={{ flex: 1 }}
                  />
                  {beysIniciais.length > 1 && (
                    <button
                      type="button"
                      className="link"
                      style={{ color: 'var(--red)', fontSize: '1rem', padding: '0 4px' }}
                      onClick={() => setBeysIniciais(beysIniciais.filter((_, i) => i !== idx))}
                      title="Remover este slot"
                    >
                      [x]
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-submit-custom"
            style={{ maxWidth: '340px', marginTop: '16px' }}
            onClick={handleCriarCampeonato}
          >
            Iniciar Torneio
          </button>

          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="link"
              onClick={() => setConfigurandoTorneio(false)}
            >
              [Cancelar]
            </button>
          </div>
        </div>
      )}

      {/* 3. SETUP DO CONFRONTO DA PARTIDA (MEU COMBO E COMBO ADV) */}
      {configurandoPartida && (
        <form onSubmit={handleComecarDisputa}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>{campeonatoAtivo ? 'Confronto do Campeonato' : 'Nova Partida Casual'}</h2>
            <button
              type="button"
              className="link"
              onClick={() => setConfigurandoPartida(false)}
            >
              [Voltar]
            </button>
          </div>

          <div className="form-group-custom">
            <label className="project-status">Meu Combo</label>
            {campeonatoAtivo?.beys && campeonatoAtivo.beys.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '6px' }}>
                  Escolher do Deck do Torneio:
                </span>
                <div className="quick-btn-container">
                  {campeonatoAtivo.beys.map((bey, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`quick-btn ${meuCombo === bey ? 'active-green' : ''}`}
                      onClick={() => setMeuCombo(bey)}
                    >
                      #{idx + 1} {bey}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              type="text"
              value={meuCombo}
              onChange={(e) => setMeuCombo(e.target.value)}
              placeholder="Ex: Phoenix Wing 9-60B"
            />
          </div>

          {/* Lado de Lançamento da Partida */}
          <div className="form-group-custom">
            <label className="project-status">Meu Lado de Lançamento</label>
            <div className="quick-btn-container">
              {ORDENS.map((lado) => (
                <button
                  key={lado}
                  type="button"
                  className={`quick-btn ${ladoPartida === lado ? 'active-yellow' : ''}`}
                  onClick={() => setLadoPartida(lado)}
                >
                  {lado}
                </button>
              ))}
            </div>
          </div>

          {!campeonatoAtivo && (
            <div className="form-group-custom">
              <label className="project-status">Meta de Pontos da Partida</label>
              <div className="quick-btn-container">
                {METAS_PONTOS.map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    className={`quick-btn ${metaPontosPartida === pts ? 'active-green' : ''}`}
                    onClick={() => setMetaPontosPartida(pts)}
                  >
                    {pts} Pontos
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit-custom" style={{ maxWidth: '340px' }}>
            Começar Duelo
          </button>
        </form>
      )}

      {/* 4. PLACAR EM TEMPO REAL E REGISTRO DE RODADAS (DENTRO DA PARTIDA) */}
      {partidaAtiva && (
        <div style={{ width: '100%' }}>
          {/* Placar em Tempo Real */}
          <div
            className="project-div"
            style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              paddingBottom: '16px',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="project-status" style={{ color: 'var(--yellow)', margin: 0 }}>
                {campeonatoAtivo ? 'Partida de Campeonato' : 'Partida Casual'} • Meta: {partidaAtiva.metaPontos} pts
              </span>
              <button
                type="button"
                className="link"
                style={{ color: 'var(--red)', fontSize: '1rem' }}
                onClick={() => {
                  if (window.confirm('Cancelar esta partida em andamento sem salvar?')) {
                    setPartidaAtiva(null);
                  }
                }}
              >
                [Cancelar Partida]
              </button>
            </div>

            {/* Mostrador Numérico do Placar com Lado Fixo de cada Jogador */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                textAlign: 'center',
                margin: '16px 0',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="project-description" style={{ color: 'var(--green)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {partidaAtiva.meuCombo}
                </span>
                <span style={{ fontFamily: 'Oxanium', fontSize: '0.95rem', color: 'var(--yellow)', letterSpacing: '0.5px' }}>
                  {partidaAtiva.lado}
                </span>
                <span style={{ fontFamily: 'Oxanium', fontSize: '3.2rem', fontWeight: 'bold', color: 'var(--white)', marginTop: '2px' }}>
                  {partidaAtiva.placarMeu}
                </span>
              </div>

              <span style={{ fontFamily: 'Oxanium', fontSize: '2rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                X
              </span>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="project-description" style={{ color: 'var(--pink)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {partidaAtiva.comboAdv}
                </span>
                <span style={{ fontFamily: 'Oxanium', fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.5px' }}>
                  {partidaAtiva.lado === 'Lado X' ? 'Lado B' : 'Lado X'}
                </span>
                <span style={{ fontFamily: 'Oxanium', fontSize: '3.2rem', fontWeight: 'bold', color: 'var(--white)', marginTop: '2px' }}>
                  {partidaAtiva.placarAdv}
                </span>
              </div>
            </div>

            {/* Aviso de Partida Encerrada se bateu a meta */}
            {partidaFinalizada && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor:
                    partidaAtiva.placarMeu > partidaAtiva.placarAdv
                      ? 'rgba(63, 255, 36, 0.15)'
                      : 'rgba(255, 39, 39, 0.15)',
                  border: `1px solid ${
                    partidaAtiva.placarMeu > partidaAtiva.placarAdv
                      ? 'var(--green)'
                      : 'var(--red)'
                  }`,
                  textAlign: 'center',
                  marginTop: '12px'
                }}
              >
                <p
                  style={{
                    fontFamily: 'Oxanium',
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    color:
                      partidaAtiva.placarMeu > partidaAtiva.placarAdv
                        ? 'var(--green)'
                        : 'var(--red)',
                    margin: 0
                  }}
                >
                  {partidaAtiva.placarMeu > partidaAtiva.placarAdv
                    ? `FIM DE PARTIDA: VITÓRIA POR ${partidaAtiva.placarMeu} x ${partidaAtiva.placarAdv}!`
                    : `FIM DE PARTIDA: DERROTA POR ${partidaAtiva.placarMeu} x ${partidaAtiva.placarAdv}!`}
                </p>
              </div>
            )}
          </div>

          {/* Formulário para registrar a rodada seguinte (se não tiver finalizado ainda) */}
          {!partidaFinalizada ? (
            <form onSubmit={handleRegistrarRodada}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '14px' }}>
                Rodada #{partidaAtiva.rodadas.length + 1} (Lançamento)
              </h3>

              {/* Seleção rápida do Bey para este lançamento se houver deck de torneio */}
              {campeonatoAtivo?.beys && campeonatoAtivo.beys.length > 1 && (
                <div className="form-group-custom">
                  <label className="project-status">Meu Bey neste Lançamento</label>
                  <div className="quick-btn-container">
                    {campeonatoAtivo.beys.map((bey, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`quick-btn ${partidaAtiva.meuCombo === bey ? 'active-green' : ''}`}
                        onClick={() => setPartidaAtiva({ ...partidaAtiva, meuCombo: bey })}
                      >
                        #{idx + 1} {bey}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Combo do Adversário para este lançamento */}
              <div className="form-group-custom">
                <label className="project-status">Combo do Adversário</label>
                <input
                  type="text"
                  value={comboAdvRodada}
                  onChange={(e) => setComboAdvRodada(e.target.value)}
                  placeholder="Ex: Wizard Rod 5-70B"
                />
              </div>

              {/* Quem Pontuou */}
              <div className="form-group-custom">
                <label className="project-status">Vencedor deste Lançamento</label>
                <div className="quick-btn-container">
                  <button
                    type="button"
                    className={`quick-btn ${vencedorRodada === 'meu' ? 'active-green' : ''}`}
                    onClick={() => setVencedorRodada('meu')}
                  >
                    Eu
                  </button>
                  <button
                    type="button"
                    className={`quick-btn ${vencedorRodada === 'adv' ? 'active-red' : ''}`}
                    onClick={() => setVencedorRodada('adv')}
                  >
                    Adversário
                  </button>
                  <button
                    type="button"
                    className={`quick-btn ${vencedorRodada === 'empate' ? 'active-yellow' : ''}`}
                    onClick={() => setVencedorRodada('empate')}
                  >
                    Empate
                  </button>
                </div>
              </div>

              {/* Tipo de Finalização */}
              {vencedorRodada !== 'empate' && (
                <div className="form-group-custom">
                  <label className="project-status">Tipo de Finalização</label>
                  <div className="quick-btn-container">
                    {FINALIZACOES.map((fin) => (
                      <button
                        key={fin.value}
                        type="button"
                        className={`quick-btn ${
                          finalizacaoRodada === fin.value ? fin.activeClass : ''
                        }`}
                        onClick={() => setFinalizacaoRodada(fin.value)}
                      >
                        {fin.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-submit-custom" style={{ maxWidth: '340px' }}>
                Confirmar Rodada
              </button>
            </form>
          ) : (
            /* Botão quando bateu a meta */
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn-submit-custom"
                disabled={salvando}
                style={{ maxWidth: '340px' }}
                onClick={handleConcluirPartida}
              >
                {salvando ? 'Salvando...' : 'Concluir Partida'}
              </button>
            </div>
          )}

          {/* Histórico dos Lançamentos desta Partida */}
          {partidaAtiva.rodadas.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="project-status" style={{ fontSize: '1.1rem' }}>
                  Lançamentos Disputados ({partidaAtiva.rodadas.length})
                </span>
                <button
                  type="button"
                  className="link"
                  style={{ fontSize: '1rem' }}
                  onClick={handleDesfazerUltimaRodada}
                >
                  [Desfazer último]
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {partidaAtiva.rodadas.map((r) => (
                  <div
                    key={r.numero}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.15rem',
                      padding: '4px 0',
                      borderBottom: '1px dotted rgba(255,255,255,0.1)'
                    }}
                  >
                    <span>
                      <span style={{ color: 'var(--yellow)', fontFamily: 'Oxanium', marginRight: '6px' }}>
                        R#{r.numero}
                      </span>
                      <span>{r.meuCombo || partidaAtiva.meuCombo}</span>
                      <span style={{ margin: '0 5px', opacity: 0.6 }}>vs</span>
                      <span>{r.comboAdv && r.comboAdv !== 'Adversário' ? r.comboAdv : 'Adversário'}</span>
                      <span style={{ marginLeft: '6px', opacity: 0.8, fontSize: '0.95rem' }}>
                        ({r.finalizacao})
                      </span>
                    </span>
                    <span style={{ fontFamily: 'Oxanium', color: 'var(--yellow)', fontWeight: 'bold' }}>
                      {r.placarApos}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
