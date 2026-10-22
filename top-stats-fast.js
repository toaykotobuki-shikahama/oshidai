'use strict';

(() => {
  const api = window.OshidaiAPI;
  const cfg = window.OSHIDAI_CONFIG;
  if (!api || !cfg) return;

  const request = api.request.bind(api);
  const cacheKey = 'oshidai-top-stats-v1:'
    + (cfg.demo ? 'demo' : cfg.gasUrl);

  const participants = document.getElementById('participants');
  const machines = document.getElementById('machineCount');
  if (!participants || !machines) return;

  const note = document.createElement('p');
  note.className = 'fine';
  note.id = 'topStatsFreshness';

  const statsBox = participants.closest('.stats');
  if (statsBox) {
    statsBox.insertAdjacentElement('afterend', note);
  }

  function valid(s) {
    return s
      && Number.isSafeInteger(s.participants)
      && s.participants >= 0
      && Number.isSafeInteger(s.machines)
      && s.machines >= 0;
  }

  function paint(s) {
    participants.textContent =
      s.participants.toLocaleString('ja-JP') + '人';

    machines.textContent =
      s.machines.toLocaleString('ja-JP') + '機種';
  }

  // 再訪時は24時間以内の前回値を先に表示
  let cached = false;

  try {
    const saved = JSON.parse(
      localStorage.getItem(cacheKey) || 'null'
    );

    if (
      saved
      && valid(saved.stats)
      && Number.isFinite(saved.at)
      && saved.at <= Date.now()
      && Date.now() - saved.at < 86400000
    ) {
      paint(saved.stats);
      cached = true;
      note.textContent =
        '前回取得時の集計を表示中・最新情報を確認しています';
    }
  } catch (ignore) {}

  if (!cached) {
    note.textContent = '参加者数・機種数を確認しています';
  }

  function accept(s) {
    if (!valid(s)) throw new Error('INVALID_STATS');

    paint(s);
    note.textContent = '';
    note.hidden = true;

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        stats: {
          participants: s.participants,
          machines: s.machines
        },
        at: Date.now()
      }));
    } catch (ignore) {}

    return s;
  }

  // 機種一覧の先読みより先に集計通信を開始
  const firstStats = request('stats')
    .then(accept)
    .catch(e => {
      note.hidden = false;
      note.textContent = cached
        ? '前回取得時の集計です・最新情報を取得できませんでした'
        : '集計を取得できませんでした';

      throw e;
    });

  firstStats.catch(() => {});

  let initialStatsClaimed = false;

  window.OshidaiAPI = Object.assign({}, api, {
    async request(action, payload = {}) {
      // app.jsの初回集計取得と通信を共用
      if (action === 'stats') {
        if (!initialStatsClaimed) {
          initialStatsClaimed = true;
          return firstStats;
        }

        return accept(await request(action, payload));
      }

      // トップ集計の取得後に機種一覧を先読み
      if (action === 'catalog') {
        try {
          await firstStats;
        } catch (ignore) {}
      }

      const result = await request(action, payload);

      // 登録・履歴確認で返ってきた集計も反映
      if (
        (action === 'register' || action === 'check')
        && result
        && valid(result.stats)
      ) {
        accept(result.stats);
      }

      return result;
    }
  });
})();
