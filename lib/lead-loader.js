// b2b-lead-agent reports/latest_leads.json 로더
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LEADS_PATH = join(process.env.HOME, 'b2b-lead-agent/reports/latest_leads.json');

export async function loadLeads() {
  try {
    const raw = await readFile(LEADS_PATH, 'utf-8');
    const leads = JSON.parse(raw);
    if (!Array.isArray(leads)) return [];
    return leads;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('[lead-loader] latest_leads.json not found');
      return [];
    }
    throw err;
  }
}

export function filterGradeA(leads) {
  return leads.filter(l => l.grade === 'A');
}

export function filterGradeAB(leads) {
  return leads.filter(l => l.grade === 'A' || l.grade === 'B');
}
