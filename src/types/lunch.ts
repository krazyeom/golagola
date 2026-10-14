export interface MenuItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  category: string;
}

export type GameMode = 'roulette' | 'fan' | 'slot' | 'ladder';

export interface RiggedConfig {
  enabled: boolean;
  targetMenuId: string | null;
  dramaticNearMiss: boolean; // 아슬아슬하게 다른 메뉴 근처에서 역전/당첨
}

export const DEFAULT_MENUS: MenuItem[] = [
  {
    id: 'kimchi-stew',
    name: '김치찌개',
    emoji: '🥘',
    color: '#EF4444',
    description: '칼칼하고 깊은 국물에 돼지고기 듬뿍 한국인 소울푸드',
    category: '한식'
  },
  {
    id: 'jeyuk',
    name: '제육볶음',
    emoji: '🥩',
    color: '#F97316',
    description: '매콤달콤 불향 가득 밥 두 공기 비우는 국민 밥도둑',
    category: '한식'
  },
  {
    id: 'tonkatsu',
    name: '돈까스',
    emoji: '🍛',
    color: '#F59E0B',
    description: '바삭바삭한 튀김옷과 두툼한 고기, 소스의 완벽한 조화',
    category: '일식/양식'
  },
  {
    id: 'chinese',
    name: '짜장면/짬뽕',
    emoji: '🍜',
    color: '#10B981',
    description: '달콤한 춘장맛 짜장이냐, 얼큰한 불맛 짬뽕이냐 영원한 고민',
    category: '중식'
  },
  {
    id: 'gukbap',
    name: '순대국/돼지국밥',
    emoji: '🍲',
    color: '#06B6D4',
    description: '뚝배기에 보글보글 끓는 진한 사골육수에 깍두기 한 점',
    category: '한식'
  },
  {
    id: 'bibimbap',
    name: '된장찌개/비빔밥',
    emoji: '🥗',
    color: '#3B82F6',
    description: '구수한 된장과 신선한 나물, 속 편하고 든든한 웰빙 점심',
    category: '한식'
  },
  {
    id: 'budae',
    name: '부대찌개',
    emoji: '🥘',
    color: '#6366F1',
    description: '스팸, 소시지, 치즈와 라면사리의 거부할 수 없는 유혹',
    category: '한식'
  },
  {
    id: 'burger',
    name: '수제버거/패스트푸드',
    emoji: '🍔',
    color: '#8B5CF6',
    description: '두툼한 육즙 패티와 감자튀김, 빠르고 확실한 만족감',
    category: '양식'
  },
  {
    id: 'kalguksu',
    name: '바지락칼국수',
    emoji: '🍜',
    color: '#EC4899',
    description: '시원하고 개운한 조개 육수에 쫄깃한 칼국수 면발과 겉절이',
    category: '분식/한식'
  },
  {
    id: 'malatang',
    name: '마라탕/쌀국수',
    emoji: '🍲',
    color: '#F43F5E',
    description: '얼얼하고 중독성 있는 마라 또는 맑고 담백한 베트남 쌀국수',
    category: '아시안'
  }
];
