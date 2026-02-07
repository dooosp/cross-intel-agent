// invest-intelligence-loop API 클라이언트
// ESM 호이스팅 대응: 환경변수는 함수로 감싸서 호출 시점에 읽기

function getBaseUrl() {
  return process.env.INVEST_INTEL_URL || 'http://localhost:3000';
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) return null; // 데이터 미존재 (파이프라인 미실행 등)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function getResult() {
  const data = await fetchWithTimeout(`${getBaseUrl()}/api/result`);
  return data;
}

export async function getSentiment(stockCode) {
  const data = await fetchWithTimeout(`${getBaseUrl()}/api/sentiment/${stockCode}`);
  return data;
}

export async function getFundamental(stockCode) {
  const data = await fetchWithTimeout(`${getBaseUrl()}/api/quant/fundamental/${stockCode}`);
  return data;
}
