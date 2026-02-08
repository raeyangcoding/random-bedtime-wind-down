(function () {
  'use strict';

  const STORAGE_KEY = 'bedtime-winddown-list';
  const DEFAULT_LIST = [
    { id: 'yt-1', source: 'youtube', videoId: 'jfKfPfyJRdk', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', title: 'Lofi Girl 24/7 直播', cover: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg' },
    { id: 'yt-2', source: 'youtube', videoId: '5qap5aO4i9A', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A', title: 'Lofi Hip Hop 学习/放松', cover: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg' },
    { id: 'bl-1', source: 'bilibili', bvid: 'BV1uv411q7Mv', url: 'https://www.bilibili.com/video/BV1uv411q7Mv', title: 'B站睡前助眠 / 白噪音', cover: '' }
  ];

  let list = [];
  let listPanelOpen = false;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => root.querySelectorAll(sel);

  function loadList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) list = parsed;
        else list = [...DEFAULT_LIST];
      } else {
        list = [...DEFAULT_LIST];
      }
    } catch (_) {
      list = [...DEFAULT_LIST];
    }
  }

  function saveList() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function parseVideoUrl(input) {
    const s = (input || '').trim();
    if (!s) return null;
    try {
      const ytMatch = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        const videoId = ytMatch[1];
        return { source: 'youtube', videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
      }
      const blMatch = s.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i) || s.match(/^(BV[a-zA-Z0-9]+)$/i);
      if (blMatch) {
        const bvid = (blMatch[1] || blMatch[0]).toUpperCase();
        return { source: 'bilibili', bvid, url: `https://www.bilibili.com/video/${bvid}` };
      }
    } catch (_) {}
    return null;
  }

  function youtubeCover(videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  function fetchYoutubeTitle(url) {
    return fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => (data && data.title) || 'YouTube 视频')
      .catch(() => 'YouTube 视频');
  }

  function addVideoToList(item) {
    if (item.source === 'youtube') {
      const id = 'yt-' + item.videoId;
      if (list.some(v => v.id === id)) return;
      return fetchYoutubeTitle(item.url).then(title => {
        list.push({
          id,
          source: 'youtube',
          videoId: item.videoId,
          url: item.url,
          title,
          cover: youtubeCover(item.videoId)
        });
        saveList();
        renderList();
      });
    }
    if (item.source === 'bilibili') {
      const id = 'bl-' + item.bvid;
      if (list.some(v => v.id === id)) return Promise.resolve();
      list.push({
        id,
        source: 'bilibili',
        bvid: item.bvid,
        url: item.url,
        title: 'B站视频 ' + item.bvid,
        cover: ''
      });
      saveList();
      renderList();
      return Promise.resolve();
    }
  }

  function removeVideo(id) {
    list = list.filter(v => v.id !== id);
    saveList();
    renderList();
  }

  function removeSelected() {
    const checked = $$('#video-list input[type="checkbox"]:checked');
    const ids = Array.from(checked).map(cb => cb.dataset.id);
    list = list.filter(v => !ids.includes(v.id));
    saveList();
    renderList();
    $('#select-all').checked = false;
  }

  function renderList() {
    const ul = $('#video-list');
    if (!ul) return;
    ul.innerHTML = list.map(v => `
      <li data-id="${v.id}">
        <img class="video-item-thumb" src="${v.cover || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="45" viewBox="0 0 80 45"%3E%3Crect fill="%233d3556" width="80" height="45"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23a89cc9" font-size="10"%3EB站%3C/text%3E%3C/svg%3E'}" alt="" />
        <div class="video-item-info">
          <p class="video-item-title">${escapeHtml(v.title)}</p>
          <span class="video-item-meta">${v.source === 'youtube' ? 'YouTube' : 'Bilibili'}</span>
        </div>
        <div class="video-item-actions">
          <input type="checkbox" data-id="${v.id}" aria-label="选择" />
          <button type="button" class="btn-delete" data-id="${v.id}" aria-label="删除">删除</button>
        </div>
      </li>
    `).join('');

    ul.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => removeVideo(btn.dataset.id));
    });
    ul.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', syncSelectAll);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function syncSelectAll() {
    const all = $$('#video-list input[type="checkbox"]');
    const checked = $$('#video-list input[type="checkbox"]:checked');
    const selectAll = $('#select-all');
    if (!selectAll) return;
    selectAll.checked = all.length > 0 && checked.length === all.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < all.length;
  }

  function pickRandom() {
    if (list.length === 0) {
      showPick(null);
      return;
    }
    const i = Math.floor(Math.random() * list.length);
    const v = list[i];
    showPick(v);
  }

  function showPick(v) {
    const cover = $('#pick-cover');
    const placeholder = $('#pick-placeholder');
    const titleEl = $('#pick-title');
    const link = $('#pick-link');
    if (!cover || !placeholder || !titleEl || !link) return;
    if (!v) {
      cover.src = '';
      cover.alt = '';
      placeholder.hidden = false;
      titleEl.textContent = '';
      link.style.display = 'none';
      return;
    }
    placeholder.hidden = true;
    cover.src = v.cover || '';
    cover.alt = v.title;
    titleEl.textContent = v.title;
    link.href = v.url;
    link.style.display = 'inline-block';
  }

  function buildShareUrl() {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(list))));
    const url = new URL(window.location.href);
    url.searchParams.set('share', data);
    url.hash = '';
    return url.toString();
  }

  function showShareResult() {
    const block = $('#share-result');
    const input = $('#share-url');
    if (!block || !input) return;
    input.value = buildShareUrl();
    block.hidden = false;
  }

  function copyShareUrl() {
    const input = $('#share-url');
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    try {
      navigator.clipboard.writeText(input.value);
      const btn = $('#btn-copy');
      if (btn) { btn.textContent = '已复制'; setTimeout(() => { btn.textContent = '复制'; }, 1500); }
    } catch (_) {}
  }

  function showMainView() {
    $('#main-view').hidden = false;
    $('#share-view').hidden = true;
  }

  function showShareView(sharedList) {
    $('#main-view').hidden = true;
    const shareView = $('#share-view');
    const shareList = $('#share-video-list');
    const shareEmpty = $('#share-empty');
    shareView.hidden = false;
    if (!sharedList || sharedList.length === 0) {
      if (shareList) shareList.innerHTML = '';
      if (shareEmpty) { shareEmpty.hidden = false; return; }
    }
    if (shareEmpty) shareEmpty.hidden = true;
    if (shareList) {
      shareList.innerHTML = sharedList.map(v => `
        <li>
          <a href="${v.url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;width:100%;text-decoration:none;color:inherit;">
            <img class="video-item-thumb" src="${v.cover || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="45"%3E%3Crect fill="%233d3556" width="80" height="45"/%3E%3C/svg%3E'}" alt="" />
            <div class="video-item-info">
              <p class="video-item-title">${escapeHtml(v.title)}</p>
              <span class="video-item-meta">${v.source === 'youtube' ? 'YouTube' : 'Bilibili'}</span>
            </div>
          </a>
        </li>
      `).join('');
    }
  }

  function initMain() {
    loadList();
    renderList();
    pickRandom();

    $('#btn-pick')?.addEventListener('click', pickRandom);

    $('#btn-toggle-list')?.addEventListener('click', () => {
      listPanelOpen = !listPanelOpen;
      const panel = $('#list-panel');
      const btn = $('#btn-toggle-list');
      if (panel) panel.hidden = !listPanelOpen;
      if (btn) btn.setAttribute('aria-expanded', listPanelOpen);
    });

    $('#select-all')?.addEventListener('change', function () {
      $$('#video-list input[type="checkbox"]').forEach(cb => { cb.checked = this.checked; });
      syncSelectAll();
    });

    $('#btn-delete-selected')?.addEventListener('click', removeSelected);

    $('#btn-add-video')?.addEventListener('click', () => {
      const form = $('#add-video-form');
      if (form) form.hidden = !form.hidden;
    });

    $('#btn-add-cancel')?.addEventListener('click', () => {
      $('#add-video-form').hidden = true;
      $('#video-url').value = '';
    });

    $('#btn-add-confirm')?.addEventListener('click', () => {
      const input = $('#video-url');
      const parsed = parseVideoUrl(input?.value);
      if (!parsed) { alert('请输入有效的 B 站或 YouTube 链接'); return; }
      addVideoToList(parsed).then(() => {
        input.value = '';
        $('#add-video-form').hidden = true;
      });
    });

    $('#btn-share')?.addEventListener('click', showShareResult);
    $('#btn-copy')?.addEventListener('click', copyShareUrl);
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const json = decodeURIComponent(escape(atob(shareData)));
        const sharedList = JSON.parse(json);
        if (Array.isArray(sharedList) && sharedList.length) {
          showShareView(sharedList);
          return;
        }
      } catch (_) {}
      showShareView([]);
      return;
    }
    initMain();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
