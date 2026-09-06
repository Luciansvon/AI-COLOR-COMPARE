import { MasterIdentity } from '../types';

export const INITIAL_MASTERS: MasterIdentity[] = [
  {
    id: 'master-wn04',
    code: 'WN-04',
    name: 'Walnut Dark Satin',
    category: 'wood',
    nominalLab: { l: 28.5, a: 8.2, b: 12.6 },
    description: 'Papan master fisik kayu Walnut gelap standar finishing satin. Digunakan untuk dining chair dan meja makan premium.',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'master-oa02',
    code: 'OA-02',
    name: 'Natural White Oak Matte',
    category: 'wood',
    nominalLab: { l: 62.4, a: 5.1, b: 24.3 },
    description: 'Papan master kayu Oak cerah alami dengan lapisan pelindung transparan matte.',
    createdAt: '2026-02-10T09:30:00Z',
  },
  {
    id: 'master-tk01',
    code: 'TK-01',
    name: 'Teak Heritage Golden',
    category: 'wood',
    nominalLab: { l: 45.2, a: 14.3, b: 31.8 },
    description: 'Papan master kayu jati tua berwarna cokelat keemasan hangat.',
    createdAt: '2026-03-01T10:15:00Z',
  },
];
