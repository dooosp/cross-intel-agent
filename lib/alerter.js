// Telegram Bot API 직접 호출 — push only

function getToken() {
  return process.env.TELEGRAM_BOT_TOKEN;
}

function getChatId() {
  return process.env.TELEGRAM_CHAT_ID;
}

export async function sendAlert(report) {
  const token = getToken();
  const chatId = getChatId();
  if (!token || !chatId) {
    console.warn('[alerter] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping alert');
    return false;
  }

  const message = formatMessage(report);
  if (!message) return false;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      console.error(`[alerter] Telegram API error: ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[alerter] Send failed: ${err.message}`);
    return false;
  }
}

function formatMessage(report) {
  const { sentimentBoosted, stockSignals, timestamp } = report;
  const hasOpportunities = sentimentBoosted.length > 0 || stockSignals.length > 0;
  if (!hasOpportunities) return null;

  const lines = [`<b>Cross-Intel Report</b>`, `${timestamp.slice(0, 10)}`, ''];

  if (sentimentBoosted.length) {
    lines.push(`<b>[Sentiment → Lead Boost]</b> ${sentimentBoosted.length}건`);
    for (const item of sentimentBoosted.slice(0, 5)) {
      lines.push(`  ${item.company} | ${item.grade} ${item.leadScore}→${item.adjustedScore}점 (${item.sector} +${item.sentimentBoost})`);
    }
    lines.push('');
  }

  if (stockSignals.length) {
    lines.push(`<b>[Lead → Stock Signal]</b> ${stockSignals.length}건`);
    for (const item of stockSignals.slice(0, 5)) {
      lines.push(`  ${item.stockName} | opp=${item.opportunityScore} senti=${item.sentimentScore} fund=${item.fundamentalScore}`);
      lines.push(`    ← ${item.leadCompany} (${item.leadScore}점)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
