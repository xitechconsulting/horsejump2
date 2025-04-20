// configgame.js - gestion de la configuration du jeu

const defaultConfig = {
  minObstacleInterval: 40,
  maxObstacleInterval: 90,
  baseGroundSpeed: 7,
  speedIncrease: 0.008,
  maxGroundSpeed: 30,
  gravity: 1,
  jumpStrength: 18,
  horseHitboxScales: "0.6,0.8,1.0",
  maxLives: 3,
  maxGroundSpeedUnlimited: false
};

const configKeys = [
  "minObstacleInterval",
  "maxObstacleInterval",
  "baseGroundSpeed",
  "speedIncrease",
  "maxGroundSpeed",
  "gravity",
  "jumpStrength",
  "horseHitboxScales",
  "maxLives",
  "maxGroundSpeedUnlimited"
];

function updateInputsFromConfig(cfg) {
  for (const key of configKeys) {
    if (key === "maxGroundSpeedUnlimited") {
      document.getElementById("maxGroundSpeedUnlimited").checked = !!cfg[key];
      continue;
    }
    const val = cfg[key];
    if (document.getElementById(key)) {
      if (key === "horseHitboxScales") {
        document.getElementById(key).value = val;
      } else {
        document.getElementById(key).value = val;
        if (document.getElementById(key + "Num")) {
          document.getElementById(key + "Num").value = val;
        }
      }
    }
  }
}

function getConfigFromInputs() {
  const cfg = {};
  for (const key of configKeys) {
    if (key === "maxGroundSpeedUnlimited") {
      cfg[key] = document.getElementById("maxGroundSpeedUnlimited").checked;
      continue;
    }
    let val;
    if (key === "horseHitboxScales") {
      val = document.getElementById(key).value.replace(/\s+/g, "");
    } else {
      val = document.getElementById(key).value;
      if (["minObstacleInterval","maxObstacleInterval","maxLives"].includes(key)) val = parseInt(val);
      else val = parseFloat(val);
    }
    cfg[key] = val;
  }
  return cfg;
}

function configToString(cfg) {
  let s = "# Paramètres de gameplay\n" +
    "minObstacleInterval=" + cfg.minObstacleInterval + "\n" +
    "maxObstacleInterval=" + cfg.maxObstacleInterval + "\n" +
    "baseGroundSpeed=" + cfg.baseGroundSpeed + "\n" +
    "speedIncrease=" + cfg.speedIncrease + "\n" +
    "maxGroundSpeed=" + cfg.maxGroundSpeed + "\n" +
    "gravity=" + cfg.gravity + "\n" +
    "jumpStrength=" + cfg.jumpStrength + "\n" +
    "horseHitboxScales=" + cfg.horseHitboxScales + "\n" +
    "maxLives=" + cfg.maxLives + "\n";
  if (cfg.maxGroundSpeedUnlimited) s += "maxGroundSpeedUnlimited=1\n";
  return s;
}

function loadConfigFromString(str) {
  const lines = str.split(/\r?\n/);
  const cfg = {...defaultConfig};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    let [key, val] = line.split('=');
    if (!key || val === undefined) continue;
    key = key.trim();
    val = val.trim();
    if (["minObstacleInterval","maxObstacleInterval","maxLives"].includes(key)) cfg[key] = parseInt(val);
    else if (["baseGroundSpeed","speedIncrease","maxGroundSpeed","gravity","jumpStrength"].includes(key)) cfg[key] = parseFloat(val);
    else if (key === "horseHitboxScales") cfg[key] = val;
    else if (key === "maxGroundSpeedUnlimited") cfg[key] = (val === '1' || val === 'true');
  }
  return cfg;
}

function downloadConfig(cfg) {
  const blob = new Blob([configToString(cfg)], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game.cfg';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  // Synchronisation sliders/numbers
  for (const key of configKeys) {
    if (document.getElementById(key) && document.getElementById(key+"Num")) {
      document.getElementById(key).addEventListener('input', e => {
        document.getElementById(key+"Num").value = e.target.value;
      });
      document.getElementById(key+"Num").addEventListener('input', e => {
        document.getElementById(key).value = e.target.value;
      });
    }
    if (key === "maxGroundSpeedUnlimited") {
      document.getElementById(key).addEventListener('change', e => {
        const cfg = getConfigFromInputs();
        updateInputsFromConfig(cfg);
      });
    }
  }
  // Valeurs par défaut
  updateInputsFromConfig(defaultConfig);

  // Bouton reset
  document.getElementById('resetBtn').onclick = () => {
    updateInputsFromConfig(defaultConfig);
  };

  // Bouton save
  document.getElementById('saveBtn').onclick = () => {
    const cfg = getConfigFromInputs();
    downloadConfig(cfg);
  };

  // Bouton import
  document.getElementById('importBtn').onclick = () => {
    document.getElementById('importFile').click();
  };
  document.getElementById('importFile').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const cfg = loadConfigFromString(evt.target.result);
      updateInputsFromConfig(cfg);
    };
    reader.readAsText(file);
  };
});
