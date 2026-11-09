// 初回データ(手元で集めたスナップショット)から data/latest.json を作る
import fs from 'node:fs';
const S = process.argv[2];
const j = (f) => JSON.parse(fs.readFileSync(S + '/' + f, 'utf8'));
const reels = j('ig_reels.json');
const out = {
  meta: { updated: '2026-11-07T04:00:00+09:00', sources: {} },
  instagram: { profile: j('profile.json')[0], daily: j('ig_daily.json'), reels, asof: '2026-11-07' },
  youtube: { asof: '2026-11-07', total: j('yt_total.json')[0], videos: j('yt_videos.json') },
  note: { asof: '2026-11-07 07:44', summary: j('note_summary.json')[0], sales: j('note_sales.json'), sources: j('note_sources.json'), articles: j('note_articles.json') },
  threads: { asof: '2026-11-07 05:30', types: j('threads_types.json'), top: j('threads_top.json') },
  amazon: { asof: '2026-11-07', summary: j('amazon_summary.json')[0], campaigns: j('amazon_campaigns.json') },
  github: { repos: j('repos.json'), commits_daily: [], recent: j('events.json') },
};
fs.writeFileSync('data/latest.json', JSON.stringify(out, null, 1));
console.log('wrote data/latest.json');
