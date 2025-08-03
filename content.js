const prefs = {
  // skip
  skipIntroDelay: 1,
  skipEnabled: true,
  // watched
  hideThreshold: 70,
  hideHomeEnabled: true,
  hideSearchEnabled: false,
  hideSubsEnabled: true,
  hideCorrEnabled: true,
  // views
  viewsHideThreshold: 1000,
  viewsHideHomeEnabled: true,
  viewsHideSearchEnabled: true,
  viewsHideSubsEnabled: true,
  viewsHideCorrEnabled: true,
  // shorts
  hideShortsEnabled: true,
  hideShortsSearchEnabled: false,
};

(function initPrefs() {
  try {
    chrome.storage.sync.get(Object.keys(prefs), result => {
      Object.assign(prefs, result);
      console.log('Prefs loaded', prefs);
    });
  } catch (e) {
    console.warn('Could not load prefs (context invalidated?)', e);
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      for (let key in changes) {
        if (prefs.hasOwnProperty(key)) {
          prefs[key] = changes[key].newValue;
          console.log(`Pref ${key} changed to`, changes[key].newValue);
        }
      }
    });
  } catch (e) {
    console.warn('Could not bind onChanged (context invalidated?)', e);
  }
})();

function skipIntro() {
  if (!prefs.skipEnabled) return;

  const netflixBtn = document.querySelector("button[data-uia='player-skip-intro']");
  const primeBtn = document.querySelector('[class*="skipelement-button"]');
  const recapBtn =
    document.querySelector("button[data-uia='viewer-skip-recap'], button[data-uia='player-skip-recap']") ||
    document.querySelector('[class*="skip-recap"], [class*="SkipRecap"]');

  const btn = netflixBtn || primeBtn || recapBtn;
  if (!btn) return;

  setTimeout(() => {
    btn.click();
    console.log('Skipped intro/recap');
  }, prefs.skipIntroDelay * 1000);
}

function hideWatched() {
  const { hideThreshold } = prefs;

  document.querySelectorAll('ytd-thumbnail-overlay-resume-playback-renderer #progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment')
    .forEach(bar => {
      const pct = parseFloat(bar.style.width) || 0;
      if (pct <= hideThreshold) return;

      let item = bar;
      while (
        item &&
        !item.matches('ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model')
      ) {
        item = item.parentElement;
      }
      if (item) item.style.display = 'none';
    });
}

function extractNumberAndSuffix(input) {
  const s = String(input).trim();
  const match = s.match(/^([\d.,]+)\s*(K|Mln|M|B)?/i);
  if (!match) return { numStr: '', suffix: '' };
  return {
    numStr: match[1],
    suffix: (match[2] || '').toUpperCase(),
  };
}

function parseToNumber(input) {
  const { numStr, suffix } = extractNumberAndSuffix(input);
  if (!numStr) return NaN;

  let multiplier = 1;
  switch (suffix.toLowerCase()) {
    case 'k':
      multiplier = numStr.includes('.') ? 1e2 : 1e3;
      break;
    case 'm':
    case 'mln':
      multiplier = numStr.includes('.') ? 1e5 : 1e6;
      break;
    case 'b':
      multiplier = numStr.includes('.') ? 1e8 : 1e9;
      break;
  }

  return parseFloat(numStr.replace(/,/g, '')) * multiplier;
}

function hideUnderVisuals() {
  const { viewsHideThreshold } = prefs;

  document.querySelectorAll('#metadata-line').forEach(metaLine => {
    const span = metaLine.querySelector('span.inline-metadata-item');
    if (!span) return;

    const views = parseToNumber(span.textContent);
    if (isNaN(views) || views >= viewsHideThreshold) return;

    let item = span;
    while (
      item &&
      !item.matches('ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model')
    ) {
      item = item.parentElement;
    }
    if (item) item.style.display = 'none';
  });

  document.querySelectorAll('yt-content-metadata-view-model').forEach(metadataContainer => {
    const metadataRows = metadataContainer.querySelectorAll('.yt-content-metadata-view-model-wiz__metadata-row');
    if (metadataRows.length < 2) return;

    const viewsSpan = metadataRows[1].querySelector('span.yt-core-attributed-string');
    if (!viewsSpan) return;

    const views = parseToNumber(viewsSpan.textContent);
    if (isNaN(views) || views >= viewsHideThreshold) return;

    let item = viewsSpan;
    while (
      item &&
      !item.matches('ytd-compact-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model')
    ) {
      item = item.parentElement;
    }
    if (item) item.style.display = 'none';
  });
}

function hideShorts() {
  document.querySelectorAll(
    'ytd-guide-section-renderer, tp-yt-paper-item, ytd-video-renderer, ytd-reel-shelf-renderer'
  ).forEach(node => {
    if (
      node.querySelector('ytm-shorts-lockup-view-model') ||
      node.querySelector('badge-shape[aria-label="Shorts"]') ||
      node.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]')
    ) {
      node.style.display = 'none';
    }
  });

  document.querySelectorAll('a[href^="/shorts/"]').forEach(link => {
    const shelf = link.closest('ytd-rich-shelf-renderer');
    if (shelf) shelf.style.display = 'none';
    const item = link.closest('ytd-rich-item-renderer');
    if (item) item.style.display = 'none';
  });

  document.querySelectorAll('a[title="Shorts"], yt-formatted-string[title="Shorts"]').forEach(link => {
    const entry =
      link.closest('ytd-guide-entry-renderer') ||
      link.closest('ytd-mini-guide-entry-renderer') ||
      link.closest('yt-chip-cloud-chip-renderer');
    if (entry) entry.style.display = 'none';
  });

  document.querySelectorAll('yt-tab-shape[tab-title="Shorts"]').forEach(link => {
    link.style.display = 'none';
  });

  document.querySelectorAll('grid-shelf-view-model, grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2)').forEach(node => {
    node.style.display = 'none';
  });

  document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(node => {
    const label = node.querySelector('.ytChipShapeChip');
    if (label && label.textContent.trim() === 'Shorts') {
      node.style.display = 'none';
    }
  });
}

function startHiding() {
  const {
    hideHomeEnabled,
    hideSearchEnabled,
    hideSubsEnabled,
    hideCorrEnabled,
    viewsHideHomeEnabled,
    viewsHideSearchEnabled,
    viewsHideSubsEnabled,
    viewsHideCorrEnabled,
    hideShortsEnabled,
    hideShortsSearchEnabled,
  } = prefs;
  const { pathname } = window.location;

  if (
    (pathname === '/' && hideHomeEnabled) ||
    (pathname === '/results' && hideSearchEnabled) ||
    (pathname === '/watch' && hideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && hideSubsEnabled)
  ) {
    hideWatched();
  }

  if (
    (pathname === '/' && viewsHideHomeEnabled) ||
    (pathname === '/results' && viewsHideSearchEnabled) ||
    (pathname === '/watch' && viewsHideCorrEnabled) ||
    (pathname === '/feed/subscriptions' && viewsHideSubsEnabled)
  ) {
    hideUnderVisuals();
  }

  if (
    hideShortsEnabled &&
    pathname !== '/feed/history' &&
    (hideShortsSearchEnabled || pathname !== '/results')
  ) {
    hideShorts();
  }
}

function parseDuration(durationText) {
  const parts = durationText.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else {
    return 0;
  }
}

function hideShortVideos() {
  chrome.storage.sync.get(["minVideoDuration"], (data) => {
    const minSeconds = (data.minVideoDuration || 0) * 60;

    document.querySelectorAll("ytd-thumbnail").forEach((thumb) => {
      const timeLabel = thumb.querySelector("span.ytd-thumbnail-overlay-time-status-renderer");
      if (!timeLabel) return;

      const timeText = timeLabel.textContent.trim();
      const durationInSec = parseDuration(timeText);

      if (durationInSec < minSeconds) {
        const parent = thumb.closest("ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer");
        if (parent) parent.style.display = "none";
      }
    });
  });
}

function onMutations() {
  skipIntro();
  startHiding();
  hideShortVideos(); // include here
}

onMutations();

// Only one MutationObserver — calls both features
const observer = new MutationObserver(onMutations);
observer.observe(document.body, { childList: true, subtree: true });
