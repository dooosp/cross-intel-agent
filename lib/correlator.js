// 핵심 교차 분석 로직
// A) Sentiment → Lead Boost: 호황 섹터의 리드 우선순위 상승
// B) Lead → Stock Signal: 대형 리드 → 관련 종목 관심 시그널

import {
  getCategoriesForSector,
  matchLeadToSector,
  matchLeadToStock,
  getCompanyKeywords,
  getAllStockCodes,
} from './sector-mapper.js';
import { getSentiment, getFundamental } from './invest-client.js';

export async function correlate(resultData, leads) {
  const sentimentBoosted = sentimentToLeadBoost(resultData, leads);
  const stockSignals = await leadToStockSignal(resultData, leads);

  return {
    timestamp: new Date().toISOString(),
    sentimentBoosted,
    stockSignals,
    summary: buildSummary(sentimentBoosted, stockSignals),
  };
}

// A) 양호 섹터 → 해당 카테고리 리드에 sentimentBoost 부여
function sentimentToLeadBoost(resultData, leads) {
  const sectorSentiment = resultData?.sectorSentiment || {};
  const boosted = [];

  // 양호 섹터 필터 (avgScore > 55)
  const bullishSectors = Object.entries(sectorSentiment)
    .filter(([, data]) => data.avgScore > 55)
    .map(([sector, data]) => ({ sector, avgScore: data.avgScore, count: data.count }));

  if (!bullishSectors.length || !leads.length) return boosted;

  for (const { sector, avgScore } of bullishSectors) {
    const matchingLeads = leads.filter(lead => matchLeadToSector(lead, sector));
    for (const lead of matchingLeads) {
      const sentimentBoost = Math.round((avgScore - 50) * 0.4); // 0~20점 범위
      boosted.push({
        leadId: lead.id,
        company: lead.company,
        leadScore: lead.score,
        grade: lead.grade,
        sector,
        sectorAvgScore: avgScore,
        sentimentBoost,
        adjustedScore: Math.min(100, lead.score + sentimentBoost),
        reason: `${sector} 섹터 센티먼트 양호 (${avgScore}점) → 리드 우선순위 +${sentimentBoost}`,
      });
    }
  }

  return boosted.sort((a, b) => b.adjustedScore - a.adjustedScore);
}

// B) Grade A 리드 → 관련 종목 시그널
async function leadToStockSignal(resultData, leads) {
  const gradeALeads = leads.filter(l => l.grade === 'A');
  if (!gradeALeads.length) return [];

  const sentiment = resultData?.sentiment || {};
  const signals = [];

  for (const lead of gradeALeads) {
    for (const stockCode of getAllStockCodes()) {
      if (!matchLeadToStock(lead, stockCode)) continue;

      const stockSentiment = sentiment[stockCode];
      let fundamentalScore = 0;

      // 펀더멘털 조회 (실패 시 0)
      try {
        const fund = await getFundamental(stockCode);
        fundamentalScore = fund?.score ?? fund?.fundamentalScore ?? 0;
      } catch {
        // 무시 — 펀더멘털 없어도 시그널 생성 가능
      }

      const sentiScore = stockSentiment?.quantScore ?? 50;
      const opportunityScore = Math.round(
        lead.score * 0.5 +
        sentiScore * 0.3 +
        (fundamentalScore > 60 ? 20 : 0)
      );

      signals.push({
        stockCode,
        stockName: stockSentiment?.name || getCompanyKeywords(stockCode)[0] || stockCode,
        leadId: lead.id,
        leadCompany: lead.company,
        leadScore: lead.score,
        sentimentScore: sentiScore,
        sentimentLabel: stockSentiment?.sentiment || 'N/A',
        fundamentalScore,
        opportunityScore,
        reason: `대형 프로젝트(${lead.company}, ${lead.score}점) + 센티먼트 ${sentiScore}점 + 펀더멘털 ${fundamentalScore}점`,
      });
    }
  }

  return signals.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function buildSummary(sentimentBoosted, stockSignals) {
  const lines = [];

  if (sentimentBoosted.length) {
    lines.push(`[Sentiment→Lead] ${sentimentBoosted.length}건 리드 부스트 발견`);
    const top = sentimentBoosted[0];
    lines.push(`  Top: ${top.company} (${top.adjustedScore}점, ${top.sector} 섹터)`);
  } else {
    lines.push('[Sentiment→Lead] 양호 섹터 매칭 리드 없음');
  }

  if (stockSignals.length) {
    lines.push(`[Lead→Stock] ${stockSignals.length}건 종목 시그널 발견`);
    const top = stockSignals[0];
    lines.push(`  Top: ${top.stockName}(${top.stockCode}) opportunity=${top.opportunityScore}`);
  } else {
    lines.push('[Lead→Stock] 대형 리드-종목 매칭 없음');
  }

  return lines.join('\n');
}
