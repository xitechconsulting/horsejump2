// Horse Jump - Prototype avec p5.js

// Variables pour le cheval
let horse;
let horseY;
let horseVY = 0;
let gravity = 1;
let isJumping = false;

// Variables pour le sol
let groundY;

// Obstacles
let obstacles = [];
let minObstacleInterval = 70;
let maxObstacleInterval = 140;
let obstacleInterval = 90; // frames (sera mis à jour aléatoirement)
let frameSinceLastObstacle = 0;

// Décor (défilement)
let bgOffset = 0;
let groundSpeed = 6;
let baseGroundSpeed = 6;
let speedIncrease = 0.007; // accélération par frame
let maxGroundSpeed = 14;
let maxGroundSpeedUnlimited = false;

// État du jeu
let gameOver = false;
let pauseAfterHit = false;
let pauseTimeout = null;

// === Mode debug (affichage des hitboxes) ===
let debugMode = false;

// === Sélection du niveau ===
let level = 0; // 0 = pas encore choisi
let horseHitboxScale = 1;

// Nouvelle variable pour stocker la position d'impact
let collisionPoint = null;

// === SCORE ===
let score = 0;

let collisionImg;
let heartImg;
let galopSound;
let ouchSound;
let ouchSegments = [];
let lives = 3;
let maxLives = 3;
let justHit = false;

// === CONFIGURATION DYNAMIQUE ===
let gameConfig = {
  minObstacleInterval: 40,
  maxObstacleInterval: 90,
  baseGroundSpeed: 7,
  speedIncrease: 0.008,
  maxGroundSpeed: 15,
  gravity: 1,
  jumpStrength: 18,
  horseHitboxScales: [0.6, 0.8, 1.0],
  maxLives: 3,
  maxGroundSpeedUnlimited: false
};

async function loadGameConfig() {
  try {
    const response = await fetch('assets/game.cfg');
    const text = await response.text();
    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      let [key, val] = line.split('=');
      if (!key || val === undefined) continue;
      key = key.trim();
      val = val.trim();
      switch (key) {
        case 'minObstacleInterval':
        case 'maxObstacleInterval':
        case 'maxLives':
          gameConfig[key] = parseInt(val);
          break;
        case 'baseGroundSpeed':
        case 'speedIncrease':
        case 'maxGroundSpeed':
        case 'gravity':
        case 'jumpStrength':
          gameConfig[key] = parseFloat(val);
          break;
        case 'horseHitboxScales':
          gameConfig[key] = val.split(',').map(Number);
          break;
        case 'maxGroundSpeedUnlimited':
          gameConfig[key] = (val === '1' || val === 'true');
          break;
        default:
          break;
      }
    }
  } catch (e) {
    console.warn('Impossible de charger game.cfg, valeurs par défaut utilisées.');
  }
}

function getUrlParam(name) {
  let results = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
  return results ? decodeURIComponent(results[1]) : null;
}

// === Chargement des images ===
let horseImgs = [];
let barrelImg;
let barrelAspect = 1; // ratio largeur/hauteur

async function loadOuchSegments() {
  // Charge les plages depuis ouch.cfg
  const response = await fetch('assets/sounds/ouch.cfg');
  const text = await response.text();
  ouchSegments = text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [start, end] = line.split(';').map(Number);
      return { start, end };
    });
}

async function preload() {
  await loadGameConfig();
  // Applique la config aux variables globales
  minObstacleInterval = gameConfig.minObstacleInterval;
  maxObstacleInterval = gameConfig.maxObstacleInterval;
  baseGroundSpeed = gameConfig.baseGroundSpeed;
  speedIncrease = gameConfig.speedIncrease;
  maxGroundSpeed = gameConfig.maxGroundSpeed;
  gravity = gameConfig.gravity;
  maxLives = gameConfig.maxLives;
  maxGroundSpeedUnlimited = gameConfig.maxGroundSpeedUnlimited || false;
  // jumpStrength et horseHitboxScales seront utilisés dans keyPressed()
  for (let i = 0; i < 4; i++) {
    horseImgs[i] = loadImage('assets/images/horse' + i + '.png');
  }
  barrelImg = loadImage('assets/images/barrel.png', img => {
    barrelAspect = img.width / img.height;
  });
  collisionImg = loadImage('assets/images/collision.png');
  heartImg = loadImage('assets/images/heart.png');
  soundFormats('mp3');
  galopSound = loadSound('assets/sounds/galop.mp3');
  ouchSound = loadSound('assets/sounds/ouch.mp3');
}

async function setup() {
  if (getUrlParam('debug') === 'true') debugMode = true;
  createCanvas(800, 400);
  horse = {
    x: 120,
    y: 0, // sera mis à jour
    w: 120, // 2x plus grand
    h: 120, // 2x plus grand
    frame: 0
  };
  groundY = height - 80;
  horseY = groundY - horse.h;
  await loadOuchSegments();
}

function draw() {
  if (level === 0) {
    showLevelChoice();
    stopGameSound();
    return;
  }
  // Accélération progressive
  if (!gameOver && !pauseAfterHit) {
    if (maxGroundSpeedUnlimited) {
      groundSpeed = groundSpeed + speedIncrease;
    } else {
      groundSpeed = min(groundSpeed + speedIncrease, maxGroundSpeed);
    }
  }
  background(120, 200, 255); // ciel
  // Affichage du score en haut à gauche
  textAlign(LEFT, TOP);
  textSize(32);
  fill(40, 40, 40);
  text('Score : ' + score, 18, 12);
  drawScrollingGround(gameOver || pauseAfterHit);
  drawLives();
  
  if (!gameOver && !pauseAfterHit) {
    startGameSound();
    handleHorse();
    handleObstacles();
    checkCollisions();
  } else if (pauseAfterHit) {
    handleHorse(true);
    handleObstacles(true);
    if (collisionPoint) {
      let sz = 70;
      image(collisionImg, collisionPoint.x - sz/2, collisionPoint.y - sz/2, sz, sz);
    }
    textAlign(CENTER, CENTER);
    textSize(48);
    fill(255, 0, 0);
    text('Touché !', width / 2, height / 2);
  } else {
    stopGameSound();
    handleHorse(true);
    handleObstacles(true);
    if (collisionPoint) {
      let sz = 70;
      image(collisionImg, collisionPoint.x - sz/2, collisionPoint.y - sz/2, sz, sz);
    }
    textAlign(CENTER, CENTER);
    textSize(48);
    fill(255, 0, 0);
    text('Perdu', width / 2, height / 2);
  }
}

function showLevelChoice() {
  background(120, 200, 255);
  textAlign(CENTER, CENTER);
  textSize(36);
  fill(60, 40, 20);
  text('Choisis un niveau', width / 2, height / 2 - 60);
  textSize(28);
  fill(40, 100, 200);
  text('1 : Facile (hitbox 60%)', width / 2, height / 2);
  fill(255, 180, 60);
  text('2 : Moyen (hitbox 80%)', width / 2, height / 2 + 50);
  fill(200, 60, 60);
  text('3 : Difficile (hitbox 100%)', width / 2, height / 2 + 100);
  textSize(18);
  fill(30);
  text('Appuie sur 1, 2 ou 3', width / 2, height / 2 + 155);
  // BOUTON CONFIG
  let btnW = 250, btnH = 44;
  let btnX = width/2 - btnW/2, btnY = height - 60;
  fill(80, 120, 220);
  stroke(30, 60, 120);
  strokeWeight(2);
  rect(btnX, btnY, btnW, btnH, 12);
  noStroke();
  fill(255);
  textSize(22);
  text('Configurer le jeu', width/2, btnY + btnH/2);
  // Gestion du clic
  if (mouseIsPressed && mouseButton === LEFT) {
    if (
      mouseX >= btnX && mouseX <= btnX + btnW &&
      mouseY >= btnY && mouseY <= btnY + btnH
    ) {
      window.open('configgame/index.html', '_blank');
    }
  }
}

function keyPressed() {
  if (level === 0) {
    if (key === '1') {
      level = 1;
      horseHitboxScale = gameConfig.horseHitboxScales[0];
      restartGame();
    } else if (key === '2') {
      level = 2;
      horseHitboxScale = gameConfig.horseHitboxScales[1];
      restartGame();
    } else if (key === '3') {
      level = 3;
      horseHitboxScale = gameConfig.horseHitboxScales[2];
      restartGame();
    }
    return;
  }
  if (gameOver && lives <= 0) {
    level = 0;
    // On retourne à l'écran de sélection de niveau
    return;
  }
  if (key === ' ' && !isJumping && !gameOver) {
    isJumping = true;
    horseVY = -gameConfig.jumpStrength;
  }
  if (gameOver && key === ' ') {
    restartGame();
  }
}

function drawScrollingGround(freeze = false) {
  // Sol vert
  fill(70, 180, 70);
  noStroke();
  rect(0, groundY, width, height - groundY);
  // Ligne de sol pour donner l'effet de défilement
  stroke(60, 160, 60);
  strokeWeight(4);
  if (!freeze) {
    bgOffset -= groundSpeed;
  }
  let lineSpacing = 40;
  for (let x = (bgOffset % lineSpacing) - lineSpacing; x < width; x += lineSpacing) {
    line(x, groundY, x + 20, groundY + 10);
  }
}

function handleHorse(freeze = false) {
  // Animation de saut
  if (!freeze) {
    if (isJumping) {
      horseVY += gravity;
      horseY += horseVY;
      if (horseY >= groundY - horse.h) {
        horseY = groundY - horse.h;
        horseVY = 0;
        isJumping = false;
      }
    }
    // Animation galop
    if (!isJumping) {
      if (frameCount % 6 === 0) {
        horse.frame = (horse.frame + 1) % horseImgs.length;
      }
    } else {
      horse.frame = 1; // posture "en l'air"
    }
  }
  // Affichage du cheval (image)
  image(horseImgs[horse.frame], horse.x, horseY, horse.w, horse.h);
  // Affichage de la hitbox en mode debug
  if (debugMode) {
    let hbW = horse.w * horseHitboxScale;
    let hbH = horse.h * horseHitboxScale;
    let hbX = horse.x + (horse.w - hbW) / 2;
    let hbY = horseY + (horse.h - hbH) / 2;
    noFill();
    stroke(0, 255, 0);
    strokeWeight(2);
    rect(hbX, hbY, hbW, hbH);
    noStroke();
  }
}

function handleObstacles(freeze = false) {
  if (!freeze) {
    frameSinceLastObstacle++;
    if (frameSinceLastObstacle >= obstacleInterval) {
      spawnObstacle();
      // Distance aléatoire pour le prochain obstacle, indépendante de la vitesse
      obstacleInterval = floor(random(minObstacleInterval, maxObstacleInterval + 1));
      frameSinceLastObstacle = 0;
    }
    // Déplacement des obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= groundSpeed;
      // SCORE : si l'obstacle vient juste de sortir à gauche, on incrémente le score
      if (obstacles[i].x + obstacles[i].w < 0) {
        score++;
        obstacles.splice(i, 1);
      }
    }
  }
  // Affichage des obstacles
  for (let obs of obstacles) {
    image(barrelImg, obs.x, obs.y, obs.w, obs.h);
    // Affichage de la hitbox en mode debug
    if (debugMode) {
      noFill();
      stroke(255, 0, 0);
      strokeWeight(2);
      rect(obs.x, obs.y, obs.w, obs.h);
      noStroke();
    }
  }
}

function spawnObstacle() {
  // On fixe la hauteur aléatoire dans une plage raisonnable
  let obsH = random(45, 65);
  let obsW = obsH * barrelAspect;
  let obsY = groundY - obsH;
  obstacles.push({
    x: width + 10,
    y: obsY,
    w: obsW,
    h: obsH
  });
}

function checkCollisions() {
  // On ajuste la hitbox du cheval selon le niveau
  let hbW = horse.w * horseHitboxScale;
  let hbH = horse.h * horseHitboxScale;
  let hbX = horse.x + (horse.w - hbW) / 2;
  let hbY = horseY + (horse.h - hbH) / 2;
  for (let obs of obstacles) {
    if (
      hbX < obs.x + obs.w &&
      hbX + hbW > obs.x &&
      hbY < obs.y + obs.h &&
      hbY + hbH > obs.y
    ) {
      // Calcul du point d'impact (centre de la zone d'intersection)
      let ix = max(hbX, obs.x);
      let iy = max(hbY, obs.y);
      let ax = min(hbX + hbW, obs.x + obs.w);
      let ay = min(hbY + hbH, obs.y + obs.h);
      collisionPoint = {
        x: (ix + ax) / 2,
        y: (iy + ay) / 2
      };
      if (!justHit) {
        lives--;
        justHit = true;
        playRandomOuch();
        if (lives <= 0) {
          gameOver = true;
        } else {
          pauseAfterHit = true;
          pauseTimeout = setTimeout(() => {
            pauseAfterHit = false;
            justHit = false;
            collisionPoint = null;
            obstacles = obstacles.filter(o => o !== obs);
          }, 1100);
        }
      }
      break;
    }
  }
}

function startGameSound() {
  if (galopSound && !galopSound.isPlaying()) {
    // On lance la lecture à 2s, et on boucle entre 2s et (durée - 2s)
    let start = 2;
    let end = galopSound.duration() - 2;
    if (end <= start) end = galopSound.duration(); // fallback sécurité
    galopSound.play(0, 1, 1, start, end - start);
    galopSound.onended(() => {
      // Boucle manuelle entre 2s et end
      if (!gameOver && level !== 0) {
        galopSound.play(0, 1, 1, start, end - start);
      }
    });
  }
}

function stopGameSound() {
  if (galopSound && galopSound.isPlaying()) {
    galopSound.stop();
    galopSound.onended(() => {}); // retire le callback
  }
}

function drawLives() {
  let sz = 38;
  let margin = 16;
  for (let i = 0; i < lives; i++) {
    image(heartImg, width - margin - sz - i * (sz + 8), margin, sz, sz);
  }
}

function playRandomOuch() {
  if (!ouchSound || ouchSegments.length === 0) return;
  let idx = floor(random(ouchSegments.length));
  let seg = ouchSegments[idx];
  // On clone le buffer pour permettre la superposition
  let snd = new p5.SoundFile();
  snd.buffer = ouchSound.buffer;
  snd.play(0, 1, 1, seg.start, seg.end - seg.start);
}

function restartGame() {
  if (pauseTimeout) clearTimeout(pauseTimeout);
  pauseAfterHit = false;
  justHit = false;
  obstacles = [];
  horseY = groundY - horse.h;
  horseVY = 0;
  isJumping = false;
  frameSinceLastObstacle = 0;
  // Nouvelle distance aléatoire au redémarrage
  obstacleInterval = floor(random(minObstacleInterval, maxObstacleInterval + 1));
  groundSpeed = baseGroundSpeed; // Réinitialise la vitesse
  gameOver = false;
  bgOffset = 0;
  collisionPoint = null; // Remettre à zéro au redémarrage
  lives = maxLives;
  score = 0; // Remise à zéro du score
  startGameSound();
}
