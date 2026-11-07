// data/latest.json を最新化する。取れなかった項目は前回の値を残し、meta.sources に状態を書く。
// 必要な環境変数:
//   GH_TOKEN       GitHub の読み取りトークン(非公開リポジトリのコミットと Threads 集計の取得に使う)
//   WINDSOR_API_KEY  Instagram を Windsor.ai 経由で取る場合(なければ Instagram は前回のまま)
import fs from 'node:fs';

const OWNER = 'oyusuke0603';
const FILE = 'data/latest.json';
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
data.meta ??= { sources: {} };
data.meta.sources ??= {};

const jstDate = (iso) => new Date(new Date(iso).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const now = new Date();
const stamp = () => new Date(now.getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);

async function step(name, fn) {
  try {
    await fn();
    data.meta.sources[name] = { at: stamp(), status: 'ok' };
    console.log('ok  ', name);
  } catch (e) {
    data.meta.sources[name] = { ...(data.meta.sources[name] || {}), status: 'error', error: String(e.message || e).slice(0, 200) };
    console.log('FAIL', name, '-', e.message);
  }
}

const gh = async (path, raw = false) => {
  const r = await fetch('https://api.github.com' + path, {
    headers: {
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      ...(process.env.GH_TOKEN ? { Authorization: 'Bearer ' + process.env.GH_TOKEN } : {}),
      'User-Agent': 'activity-dashboard',
    },
  });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${path}`);
  return raw ? r.text() : r.json();
};

await step('github', async () => {
  const repos = await gh(`/user/repos?per_page=100&sort=pushed&affiliation=owner`);
  const mine = repos.filter((r) => r.owner.login === OWNER && !r.fork);
  data.github.repos = mine.map((r) => ({
    repo: r.name,
    description: r.description || '',
    visibility: r.private ? '非公開' : '公開',
    language: r.language || '-',
    pushed: jstDate(r.pushed_at),
  }));

  const since = new Date(now.getTime() - 14 * 86400e3).toISOString();
  const counts = new Map();
  for (let i = 13; i >= 0; i--) counts.set(jstDate(new Date(now.getTime() - i * 86400e3)), 0);
  const recent = [];
  for (const r of mine.filter((x) => x.pushed_at > since)) {
    const commits = [];
    for (let page = 1; page <= 10; page++) {
      const part = await gh(`/repos/${OWNER}/${r.name}/commits?since=${since}&per_page=100&page=${page}`);
      commits.push(...part);
      if (part.length < 100) break;
    }
    for (const c of commits) {
      const d = jstDate(c.commit.author.date);
      if (counts.has(d)) counts.set(d, counts.get(d) + 1);
      const name = c.commit.author.name || '';
      const bot = /github-actions|claude/i.test(name);
      if (!bot) recent.push({ date: d, source: r.name, text: c.commit.message.split('\n')[0].slice(0, 90), at: c.commit.author.date });
    }
  }
  data.github.commits_daily = [...counts].map(([date, count]) => ({ date, count }));
  recent.sort((a, b) => b.at.localeCompare(a.at));
  data.github.recent = recent.slice(0, 12).map(({ at, ...x }) => x);
});

await step('threads', async () => {
  const md = await gh(`/repos/${OWNER}/threads-auto-post/contents/insights_summary.md`, true);
  const section = (title) => {
    const m = md.split(/^## /m).find((s) => s.startsWith(title));
    if (!m) throw new Error('見出しが見つかりません: ' + title);
    return m.split('\n').filter((l) => l.startsWith('|')).slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  };
  data.threads.types = section('型別').map(([type, posts, v, l, rp]) => ({ type, posts: +posts, avg_views: +v, avg_likes: +l, avg_replies: +rp }));
  data.threads.top = section('views上位').slice(0, 10).map(([views, likes, posted, type, text]) => ({ views: +views, likes: +likes, posted: posted.slice(0, 10), type, text }));
  data.threads.asof = (md.match(/更新\(JST\): ([0-9: -]+)/) || [])[1] || stamp();
});

await step('instagram', async () => {
  const key = process.env.WINDSOR_API_KEY;
  if (!key) throw new Error('WINDSOR_API_KEY が未設定です(Instagram は前回の値のまま)');
  const q = async (fields, preset = 'last_30d') => {
    const u = `https://connectors.windsor.ai/instagram?api_key=${key}&date_preset=${preset}&fields=${fields.join(',')}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error(`Windsor ${r.status}`);
    const j = await r.json();
    return j.data || [];
  };
  const [prof] = await q(['followers_count', 'follows_count', 'media_count'], 'last_7d');
  if (prof) data.instagram.profile = { account: 'oyusuke0603', followers: prof.followers_count, following: prof.follows_count, posts: prof.media_count };
  data.instagram.daily = (await q(['date', 'reach_1d', 'follower_count_1d'])).map((r) => ({ date: r.date, reach: r.reach_1d, new_followers: r.follower_count_1d }));
  const media = await q(['timestamp', 'media_caption', 'media_views', 'media_reach', 'media_like_count']);
  data.instagram.reels = media
    .map((m) => {
      const cap = m.media_caption || '';
      const series = cap.includes('異世界デバッガー') ? '異世界デバッガー' : cap.includes('闘病記') ? '闘病記' : 'その他';
      return { date: m.timestamp.slice(0, 10), series, title: cap.split('\n')[0].slice(0, 32), views: m.media_views, reach: m.media_reach, likes: m.media_like_count };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  data.instagram.asof = stamp();
});

data.meta.updated = stamp().replace(' ', 'T') + '+09:00';
fs.writeFileSync(FILE, JSON.stringify(data, null, 1));
