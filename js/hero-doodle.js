const hero = document.querySelector('.hero');

if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const playground = hero.querySelector('.hero-playground');
  const doodle = hero.querySelector('.hero-doodle');
  const note = hero.querySelector('.doodle-note');
  function moveDoodle(event) {
    const bounds = playground.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const nx = x / bounds.width;
    const ny = y / bounds.height;
    const margin = 56;

    const skating = nx < .28 && ny > .55;
    const climbing = nx > .76 && ny > .48;
    const dancing = nx > .35 && nx < .68 && ny > .68;
    const cartwheeling = ny < .28;
    let figureX = Math.max(margin, Math.min(bounds.width - margin, x));
    let figureY = Math.max(margin, Math.min(bounds.height - margin, y));

    if (climbing && !cartwheeling) {
      figureX = bounds.width * .95 - 46;
      const wallHeight = Math.max(128, Math.min(210, bounds.height * .34));
      const wallTop = bounds.height * .93 - wallHeight;
      figureY = wallTop + 18 + (ny - .48) / .52 * (wallHeight - 42);
    }

    doodle.style.left = `${figureX}px`;
    doodle.style.top = `${figureY}px`;
    note.style.left = doodle.style.left;
    note.style.top = doodle.style.top;

    hero.classList.toggle('is-skating', skating && !cartwheeling);
    hero.classList.toggle('is-climbing', climbing && !cartwheeling);
    hero.classList.toggle('is-dancing', dancing && !cartwheeling);
    hero.classList.toggle('is-cartwheeling', cartwheeling);
    hero.classList.add('is-playing');
  }

  hero.addEventListener('pointerenter', moveDoodle);
  hero.addEventListener('pointermove', moveDoodle);
  hero.addEventListener('pointerleave', () => {
    hero.classList.remove('is-playing', 'is-skating', 'is-climbing', 'is-dancing', 'is-cartwheeling');
  });
}
