import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export default function MatchList() {
  const [filtro, setFiltro] = useState('Todas'); // 'Todas' | 'Campeonato' | 'Casual'
  const [partidaExpandida, setPartidaExpandida] = useState(null);

  const todasPartidas = useLiveQuery(
    () => db.partidas.reverse().toArray(),
    []
  );

  const handleDelete = async (id) => {
    if (window.confirm('Deseja excluir esta partida?')) {
      await db.partidas.delete(id);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Tem certeza que deseja apagar todas as partidas registradas?')) {
      await db.partidas.clear();
      await db.campeonatos.clear();
    }
  };

  if (!todasPartidas) {
    return <p className="project-description">Carregando partidas...</p>;
  }

  // Filtragem
  const partidas = todasPartidas.filter((p) => {
    if (filtro === 'Todas') return true;
    return p.contexto === filtro;
  });

  const total = partidas.length;
  const vitorias = partidas.filter((p) => p.resultado === 'Vitória').length;
  const derrotas = partidas.filter((p) => p.resultado === 'Derrota').length;
  const taxaVitoria = total > 0 ? Math.round((vitorias / total) * 100) : 0;

  const getStatusClass = (resultado) => {
    if (resultado === 'Vitória') return 'project-status vitoria';
    if (resultado === 'Derrota') return 'project-status derrota';
    return 'project-status empate';
  };

  return (
    <div style={{ width: '100%' }}>
      <h2>Histórico de Partidas ({total})</h2>

      {/* Filtros de Modo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['Todas', 'Campeonato', 'Casual'].map((modo) => (
          <button
            key={modo}
            type="button"
            className={`quick-btn ${filtro === modo ? 'active-yellow' : ''}`}
            onClick={() => setFiltro(modo)}
            style={{ fontSize: '1rem', padding: '6px 12px' }}
          >
            {modo}
          </button>
        ))}
      </div>

      {/* Caixa de resumo / estatísticas */}
      <div className="summary-stats-box">
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Partidas: </span>
          <span className="project-description">{total}</span>
        </div>
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Vitórias: </span>
          <span className="project-description">{vitorias}</span>
        </div>
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Derrotas: </span>
          <span className="project-description">{derrotas}</span>
        </div>
        <div>
          <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Win Rate: </span>
          <span className="project-description">{taxaVitoria}%</span>
        </div>
      </div>

      {total > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <button type="button" className="link" onClick={handleClearAll}>
            [Limpar todo o histórico]
          </button>
        </div>
      )}

      {total === 0 ? (
        <p className="project-description">
          {filtro === 'Todas'
            ? 'Nenhuma partida registrada ainda.'
            : `Nenhuma partida em modo ${filtro}.`}
        </p>
      ) : (
        <div id="projects-list">
          {partidas.map((match) => {
            const isChamp = match.contexto === 'Campeonato';
            const temPlacar = match.placar_meu !== undefined && match.placar_adv !== undefined;
            const expandida = partidaExpandida === match.id;

            return (
              <div
                className="project-div"
                key={match.id}
              >
                <div className={getStatusClass(match.resultado)}>
                  {temPlacar ? `${match.placar_meu} x ${match.placar_adv}` : match.resultado}
                  <span
                    style={{
                      marginLeft: '8px',
                      color: isChamp ? 'var(--yellow)' : 'var(--blue)',
                      fontStyle: 'normal'
                    }}
                  >
                    [{isChamp ? `Camp${match.fase_campeonato ? ` • ${match.fase_campeonato}` : ''}` : 'Casual'}]
                  </span>
                </div>

                <div className="project-description">
                  <strong>{match.meu_combo || 'Meu combo'}</strong>{' '}
                  <span style={{ color: 'var(--yellow)', fontSize: '0.95rem' }}>
                    ({match.ordem || 'Lado X'})
                  </span>{' '}
                  vs{' '}
                  {match.combo_adv || 'Adversário'}{' '}
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>
                    ({match.ordem === 'Lado X' ? 'Lado B' : 'Lado X'})
                  </span>
                </div>

                <div className="project-links">
                  {match.rodadas && match.rodadas.length > 0 && (
                    <button
                      type="button"
                      className="link"
                      style={{ color: 'var(--yellow)' }}
                      onClick={() => setPartidaExpandida(expandida ? null : match.id)}
                    >
                      {expandida ? 'Ocultar Rodadas' : `Ver ${match.rodadas.length} Rodadas`}
                    </button>
                  )}

                  <button
                    type="button"
                    className="link"
                    onClick={() => handleDelete(match.id)}
                  >
                    Excluir
                  </button>
                </div>

                {/* Detalhes expandidos das rodadas individuais desta partida */}
                {expandida && match.rodadas && match.rodadas.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '4px'
                    }}
                  >
                    {match.rodadas.map((r) => (
                      <div
                        key={r.numero}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '1.05rem',
                          padding: '3px 0',
                          color: '#b0c0d0'
                        }}
                      >
                        <span>
                          <span style={{ color: 'var(--yellow)', fontFamily: 'Oxanium', marginRight: '6px' }}>
                            R#{r.numero}
                          </span>
                          <span>{r.meuCombo || match.meu_combo || 'Meu Bey'}</span>
                          <span style={{ margin: '0 5px', opacity: 0.6 }}>vs</span>
                          <span>{r.comboAdv && r.comboAdv !== 'Adversário' ? r.comboAdv : 'Adversário'}</span>
                          <span style={{ marginLeft: '6px', opacity: 0.8, fontSize: '0.95rem' }}>
                            ({r.finalizacao})
                          </span>
                        </span>
                        <span style={{ fontFamily: 'Oxanium', color: 'var(--white)', fontWeight: 'bold' }}>
                          {r.placarApos}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
