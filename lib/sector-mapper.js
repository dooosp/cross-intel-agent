// invest-intel 섹터 ↔ b2b-lead 카테고리 매핑

// invest-intel 섹터 → b2b-lead에서 관련될 수 있는 카테고리 키워드
const sectorToCategory = {
  TECH:     ['datacenter', 'factory', 'semiconductor', '반도체', '데이터센터', 'IT'],
  AUTO:     ['factory', '자동차', '배터리', 'EV', '전기차'],
  CHEMICAL: ['factory', '화학', '석유화학', '정유'],
  ENERGY:   ['factory', 'marine', '에너지', 'LNG', '발전', '신재생', '선박', '조선'],
  BIO:      ['coldchain', '바이오', '제약', '의료'],
  FINANCE:  ['datacenter', '금융', 'IT', '데이터센터'],
  HOLDING:  ['datacenter', 'factory', '데이터센터'],
};

// 종목코드 → 회사명 부분매칭 키워드
const stockCompanyMap = {
  '005930': ['삼성전자', '삼성'],
  '000660': ['SK하이닉스', 'SK하이닉스'],
  '035420': ['NAVER', '네이버'],
  '035720': ['카카오'],
  '036570': ['엔씨소프트', 'NC'],
  '005380': ['현대자동차', '현대차', '현대'],
  '000270': ['기아', 'KIA'],
  '105560': ['KB금융', 'KB'],
  '055550': ['신한지주', '신한'],
  '086790': ['하나금융', '하나'],
  '316140': ['우리금융', '우리'],
  '066570': ['LG전자', 'LG'],
  '006400': ['삼성SDI', 'SDI'],
  '207940': ['삼성바이오', '삼성바이오로직스'],
  '068270': ['셀트리온'],
  '051910': ['LG화학'],
  '096770': ['SK이노베이션', 'SK이노'],
  '032830': ['삼성생명'],
  '024110': ['기업은행', 'IBK'],
  '003550': ['LG'],
};

// invest-intel sectorMap 복사 (종목코드 → 섹터)
const stockSectorMap = {
  '005930': 'TECH', '000660': 'TECH', '035420': 'TECH',
  '035720': 'TECH', '036570': 'TECH', '066570': 'TECH',
  '006400': 'TECH', '005380': 'AUTO', '000270': 'AUTO',
  '105560': 'FINANCE', '055550': 'FINANCE', '086790': 'FINANCE',
  '316140': 'FINANCE', '032830': 'FINANCE', '024110': 'FINANCE',
  '207940': 'BIO', '068270': 'BIO', '051910': 'CHEMICAL',
  '096770': 'ENERGY', '003550': 'HOLDING',
};

export function getCategoriesForSector(sector) {
  return sectorToCategory[sector] || [];
}

export function getCompanyKeywords(stockCode) {
  return stockCompanyMap[stockCode] || [];
}

export function getSectorForStock(stockCode) {
  return stockSectorMap[stockCode] || null;
}

export function matchLeadToSector(lead, sector) {
  const categories = getCategoriesForSector(sector);
  if (!categories.length) return false;

  const text = `${lead.company} ${lead.summary} ${lead.product || ''}`.toLowerCase();
  return categories.some(cat => text.includes(cat.toLowerCase()));
}

export function matchLeadToStock(lead, stockCode) {
  const keywords = getCompanyKeywords(stockCode);
  if (!keywords.length) return false;

  const text = `${lead.company} ${lead.summary}`;
  return keywords.some(kw => text.includes(kw));
}

export function getAllStockCodes() {
  return Object.keys(stockSectorMap);
}

export function getAllSectors() {
  return [...new Set(Object.values(stockSectorMap))];
}
