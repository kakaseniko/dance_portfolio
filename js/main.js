const dropdown = document.querySelector('.nav-dropdown');
const trigger = document.querySelector('.nav-trigger');
const themeToggle = document.querySelector('.theme-toggle');

if (themeToggle) {
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    const isDark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    const label = themeToggle.querySelector('.theme-toggle-label');
    if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
  };

  applyTheme(localStorage.getItem('portfolio-theme') === 'dark' ? 'dark' : 'light');
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('portfolio-theme', nextTheme);
    applyTheme(nextTheme);
  });
}

if (dropdown && trigger) {
  trigger.addEventListener('click', () => {
    const isOpen = dropdown.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      dropdown.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  });
}

const videoDialog = document.querySelector('.video-lightbox');
const dialogVideo = videoDialog?.querySelector('.video-lightbox-player');
const videoClose = videoDialog?.querySelector('.video-lightbox-close');
const dialogCaption = videoDialog?.querySelector('.video-lightbox-caption');

if (videoDialog && dialogVideo && videoClose) {
  const closeVideo = () => {
    dialogVideo.pause();
    dialogVideo.removeAttribute('src');
    dialogVideo.load();
  };

  document.querySelectorAll('.video-card video').forEach((preview) => {
    const openVideo = () => {
      const source = preview.querySelector('source');
      if (!source) return;
      const card = preview.closest('.video-card');
      const caption = card?.querySelector('figcaption');
      if (caption && dialogCaption) {
        dialogCaption.querySelector('.video-lightbox-number').textContent = caption.querySelector(':scope > span')?.textContent ?? '';
        dialogCaption.querySelector('h2').textContent = caption.querySelector('h3')?.textContent ?? '';
        dialogCaption.querySelector('p').textContent = caption.querySelector('p')?.textContent ?? '';
      }
      dialogVideo.src = source.src;
      dialogVideo.defaultMuted = false;
      dialogVideo.muted = false;
      videoDialog.showModal();
      dialogVideo.load();
      dialogVideo.play().catch(() => {});
      videoClose.focus();
    };

    preview.addEventListener('click', openVideo);
    preview.addEventListener('contextmenu', (event) => event.preventDefault());
    preview.addEventListener('play', () => {
      if (!videoDialog.open) preview.pause();
    });
    preview.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openVideo();
      }
    });
  });

  videoClose.addEventListener('click', () => videoDialog.close());
  videoDialog.addEventListener('click', (event) => {
    if (event.target === videoDialog) videoDialog.close();
  });
  videoDialog.addEventListener('close', closeVideo);
}
