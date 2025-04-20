console.log('configouch.js loaded');

const CFG_PATH = '../assets/sounds/ouch.cfg';
const MP3_PATH = '../assets/sounds/ouch.mp3';

new p5((p) => {
  let segments = [];
  let ouchSound;
  let isDirty = false;

  function showError(msg) {
    const err = document.getElementById('errorMsg');
    err.style.display = 'block';
    err.textContent = msg;
  }

  function render() {
    const list = document.getElementById('sounds-list');
    list.innerHTML = '';
    segments.forEach((seg, idx) => {
      const row = document.createElement('div');
      row.className = 'sound-row';
      row.innerHTML = `
        <span class="sound-label">Son ${idx+1}</span>
        <span>Début: <span id="start-${idx}">${seg.start.toFixed(2)}</span>s</span>
        <span class="sound-controls">
          <button onclick="window.adjustSeg(${idx}, 'start', -0.05)">-</button>
          <button onclick="window.adjustSeg(${idx}, 'start', +0.05)">+</button>
        </span>
        <span>Fin: <span id="end-${idx}">${seg.end.toFixed(2)}</span>s</span>
        <span class="sound-controls">
          <button onclick="window.adjustSeg(${idx}, 'end', -0.05)">-</button>
          <button onclick="window.adjustSeg(${idx}, 'end', +0.05)">+</button>
        </span>
        <button onclick="window.playSeg(${idx})">▶️ Play</button>
      `;
      list.appendChild(row);
    });
  }

  window.adjustSeg = function(idx, field, delta) {
    let seg = segments[idx];
    seg[field] = Math.max(0, +(seg[field] + delta).toFixed(2));
    if (seg.end <= seg.start) seg.end = seg.start + 0.05;
    isDirty = true;
    render();
  };

  window.playSeg = function(idx) {
    if (!ouchSound || !ouchSound.isLoaded()) {
      showError("Le son n'est pas encore prêt. Attends la fin du chargement.");
      return;
    }
    document.getElementById('errorMsg').style.display = 'none';
    p.userStartAudio && p.userStartAudio();
    ouchSound.stop();
    let seg = segments[idx];
    ouchSound.play(0, 1, 1, seg.start, seg.end - seg.start);
  };

  async function fetchCfg() {
    try {
      const resp = await fetch(CFG_PATH + '?t=' + Date.now());
      const text = await resp.text();
      return text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
          const [start, end] = line.split(';').map(Number);
          return { start, end };
        });
    } catch (e) {
      showError("Impossible de charger ouch.cfg : " + e);
      return [];
    }
  }

  async function main() {
    console.log('main() called');
    document.getElementById('sounds-list').textContent = 'Chargement des segments...';
    segments = await fetchCfg();
    render();
    document.getElementById('sounds-list').textContent = 'Chargement du son...';
    try {
      ouchSound = p.loadSound(MP3_PATH, () => {
        document.getElementById('sounds-list').textContent = '';
        render();
        console.log('ouch.mp3 loaded');
      }, (err) => {
        showError('Erreur chargement ouch.mp3 : ' + err);
        console.log('ouch.mp3 load error', err);
      });
    } catch (e) {
      showError('Erreur JS lors du chargement du son : ' + e);
      console.log('JS error loading sound', e);
    }
  }

  p.setup = () => {
    main();
    document.getElementById('saveBtn').onclick = () => {
      if (!isDirty) return;
      let content = segments.map(seg => `${seg.start};${seg.end}`).join('\n');
      let blob = new Blob([content], {type: 'text/plain'});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ouch.cfg';
      a.click();
      document.getElementById('successMsg').style.display = 'block';
      document.getElementById('successMsg').textContent = 'Nouveau ouch.cfg téléchargé. Remplace le fichier original côté serveur.';
      setTimeout(()=>{
        document.getElementById('successMsg').style.display = 'none';
      }, 5000);
      isDirty = false;
    };
  };

  // Pas besoin de draw()
});
