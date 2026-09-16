import Dexie from 'dexie';

export const db = new Dexie('BeybladeXTrackerDB');

db.version(1).stores({
  partidas: '++id, contexto, meu_combo, combo_adv, ordem, resultado, finalizacao'
});

db.version(2).stores({
  partidas: '++id, contexto, meu_combo, combo_adv, ordem, resultado, finalizacao, campeonato_id',
  campeonatos: '++id, status, data_inicio, data_fim, vitorias, derrotas, total_partidas'
});

db.version(3).stores({
  partidas: '++id, contexto, meu_combo, combo_adv, ordem, resultado, finalizacao, campeonato_id, fase_campeonato',
  campeonatos: '++id, formato, fase_atual, status, data_inicio, data_fim, vitorias, derrotas, total_partidas'
});

db.version(4).stores({
  partidas: '++id, contexto, meu_combo, combo_adv, ordem, resultado, finalizacao, campeonato_id, fase_campeonato',
  campeonatos: '++id, formato, fase_atual, status, pontos_vitoria, data_inicio, data_fim, vitorias, derrotas, total_partidas'
});

db.version(5).stores({
  partidas: '++id, contexto, meu_combo, combo_adv, ordem, resultado, finalizacao, campeonato_id, fase_campeonato, placar_meu, placar_adv, data',
  campeonatos: '++id, formato, fase_atual, status, pontos_vitoria, data_inicio, data_fim, vitorias, derrotas, total_partidas'
});
