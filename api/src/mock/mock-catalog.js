/**
 * Catálogo FICTÍCIO usado no modo mock. Títulos, artistas e álbuns são inventados;
 * só os ISRCs vêm do contrato. O formato imita o objeto `track` da Spotify Web API,
 * para que o resto da API (serviço, regra do BR, mapper) rode exatamente igual.
 *
 * Cenários cobertos de propósito:
 *   - disponível no BR, com e sem prévia de áudio
 *   - is_playable: false no mercado BR
 *   - ausente no mercado BR (só aparece na busca sem mercado)
 *   - ISRC não encontrado (QZNJX2078148 não está no catálogo)
 *   - álbum com precisão de data só por ano
 */
const entry = (isrc, data) => ({ isrc, ...data });

export const MOCK_CATALOG = [
  entry('NO1R42509310', { title: 'Nordlys over Fjorden', artists: ['Ingrid Solvang'], album: 'Polarnatt', releaseDate: '2025-03-14', durationMs: 214000, inBrazil: 'absent', preview: true }),
  entry('NO1R42511410', { title: 'Kalde Hender', artists: ['Ingrid Solvang', 'Eirik Moen'], album: 'Polarnatt', releaseDate: '2025-03-14', durationMs: 187500, inBrazil: 'available' }),
  entry('BRC310600002', { title: 'Maré de Março', artists: ['Bia Calado'], album: 'Ventos do Sul', releaseDate: '2006', precision: 'year', durationMs: 241000, inBrazil: 'available', preview: true }),
  entry('BR1SP1200071', { title: 'Avenida Paulista, 4h', artists: ['Os Garoa'], album: 'Concreto & Neblina', releaseDate: '2012-08-21', durationMs: 198000, inBrazil: 'available' }),
  entry('BR1SP1200070', { title: 'Bloco da Garoa', artists: ['Os Garoa', 'Lia Brandão'], album: 'Concreto & Neblina', releaseDate: '2012-08-21', durationMs: 176000, inBrazil: 'available', preview: true }),
  entry('BR1SP1500002', { title: 'Céu de Fevereiro', artists: ['Lia Brandão'], album: 'Céu de Fevereiro', releaseDate: '2015-02-06', durationMs: 263000, inBrazil: 'not-playable' }),
  entry('BXKZM1900338', { title: 'Golden Hour Drive', artists: ['Mara Keyes'], album: 'Night Shift', releaseDate: '2019-10-04', durationMs: 205000, inBrazil: 'available', preview: true }),
  entry('BXKZM1900345', { title: 'Zero Gravity', artists: ['Mara Keyes', 'DJ Halden'], album: 'Night Shift', releaseDate: '2019-10-04', durationMs: 228000, inBrazil: 'available' }),
  entry('QZNJX2081700', { title: 'Echoes in Blue', artists: ['The Low Tides'], album: 'Shoreline', releaseDate: '2020-06', precision: 'month', durationMs: 252000, inBrazil: 'absent' }),
];
