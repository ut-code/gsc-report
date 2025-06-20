const { google } = require('googleapis');
const { WebhookClient } = require('discord.js');
const dayjs = require('dayjs');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  keyFile: 'service_account.json', // または別の認証方法
});

const endDate = dayjs().format('YYYY-MM-DD');
const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

async function getSearchPerformance() {
  const client = await auth.getClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth: client });

  const res = await searchconsole.searchanalytics.query({
    siteUrl: "sc-domain:utcode.net",
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 25000,
    },
  });

  const grouped = {};

  for (const row of res.data.rows || []) {
    const url = row.keys[0];
    const subdomain = new URL(url).hostname.split('.').slice(0, -2).join('.') || 'utcode.net';

    if (!grouped[subdomain]) {
      grouped[subdomain] = { clicks: 0, impressions: 0 };
    }

    grouped[subdomain].clicks += row.clicks;
    grouped[subdomain].impressions += row.impressions;
  }

  return grouped;
}

async function sendToDiscord(data) {
  // const webhook = new WebhookClient({ id: process.env.WEBHOOK_ID, token: process.env.WEBHOOK_TOKEN });

  const fields = Object.entries(data)
    .filter(([sub, stats]) => stats.clicks > 0)
    .sort(([sub1, stats1], [sub2, stats2]) => stats2.clicks - stats1.clicks)
    .slice(0, 10)
    .map(([sub, stats], i) => ({
      name: `${i+1}: ${sub} ${channelIds[sub] || ""}`,
      value: `クリック数: ${stats.clicks}`,
      inline: true,
    }));

  await webhook.send({
    embed: {
      title: "1週間の検索パフォーマンス",
      description: `${startDate} 〜 ${endDate}`,
      fields
    },
  });
}

const channelIds = {
  "utcode.net": "<#1347510096044883988>",
  "syllabus": "<#1356879628907712572>",
  "create-cpu": "<#1354435873323876462>",
  "coursemate": "<#1352695487056052366>",
  "learn": "<#1368523267911974912>",
  "ut-bridge": "<#1346690984217677864>",
  "extra": "<#1353557111052828716>",
  "itsuhima": "<#1356806556297072793>",
  "shortcut-game": "<#1364040140850462741>",
};

(async () => {
  const data = await getSearchPerformance();
  await sendToDiscord(data);
})();
