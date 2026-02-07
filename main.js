#!/usr/bin/env node
// Cross-Intel Agent: invest sentiment × B2B lead 교차 분석

import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// .env 로드 (ESM 호이스팅 대응 — import보다 먼저 실행)
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '.env'));

import { getResult } from './lib/invest-client.js';
import { loadLeads } from './lib/lead-loader.js';
import { correlate } from './lib/correlator.js';
import { sendAlert } from './lib/alerter.js';

async function main() {
  console.log('[cross-intel] Starting cross-intelligence analysis...');
  const startTime = Date.now();

  // 1. invest-intel 센티먼트 데이터 fetch
  let resultData = null;
  try {
    resultData = await getResult();
    if (!resultData) {
      console.warn('[cross-intel] No sentiment data yet (pipeline not run). Continuing with empty data.');
      resultData = { sentiment: {}, sectorSentiment: {} };
    } else {
      const stockCount = Object.keys(resultData?.sentiment || {}).length;
      const sectorCount = Object.keys(resultData?.sectorSentiment || {}).length;
      console.log(`[cross-intel] Sentiment loaded: ${stockCount} stocks, ${sectorCount} sectors`);
    }
  } catch (err) {
    console.warn(`[cross-intel] Sentiment fetch failed: ${err.message}. Continuing with partial data.`);
    resultData = { sentiment: {}, sectorSentiment: {} };
  }

  // 2. b2b-lead 최신 리드 로드
  const leads = await loadLeads();
  console.log(`[cross-intel] Leads loaded: ${leads.length} total, ${leads.filter(l => l.grade === 'A').length} grade-A`);

  // 3. 교차 분석
  const report = await correlate(resultData, leads);
  console.log(`[cross-intel] Correlation done:`);
  console.log(report.summary);

  // 4. 리포트 저장
  const reportsDir = join(__dirname, 'reports');
  await mkdir(reportsDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const reportPath = join(reportsDir, `cross-intel-${dateStr}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`[cross-intel] Report saved: ${reportPath}`);

  // 5. Telegram 알림 (기회 있을 때만)
  const hasOpportunities = report.sentimentBoosted.length > 0 || report.stockSignals.length > 0;
  if (hasOpportunities) {
    const sent = await sendAlert(report);
    console.log(`[cross-intel] Telegram alert: ${sent ? 'sent' : 'skipped/failed'}`);
  } else {
    console.log('[cross-intel] No opportunities found, skipping alert.');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[cross-intel] Done in ${elapsed}s`);
}

function loadEnv(envPath) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env 없으면 환경변수로만 동작
  }
}

main().catch(err => {
  console.error('[cross-intel] Fatal:', err);
  process.exit(1);
});
