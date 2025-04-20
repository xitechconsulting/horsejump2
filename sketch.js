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
let obstacleInterval = 90; // frames
let frameSinceLastObstacle = 0;

// Décor (défilement)
let bgOffset = 0;
let groundSpeed = 6;

// État du jeu
let gameOver = false;

// === Mode debug (affichage des hitboxes) ===
let debugMode = false;

// === Sélection du niveau ===
let level = 0; // 0 = pas encore choisi
let horseHitboxScale = 1;

// Nouvelle variable pour stocker la position d'impact
let collisionPoint = null;

let collisionImg;
let heartImg;
let galopSound;
let lives = 3;
let maxLives = 3;
let justHit = false;

function getUrlParam(name) {
  let results = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
  return results ? decodeURIComponent(results[1]) : null;
}

// === Chargement des images ===
let horseImgs = [];
let barrelImg;
let barrelAspect = 1; // ratio largeur/hauteur

function preload() {
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
}

function setup() {
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
}

function draw() {
  if (level === 0) {
    showLevelChoice();
    stopGameSound();
    return;
  }
  background(120, 200, 255); // ciel
  drawScrollingGround(gameOver);
  drawLives();
  
  if (!gameOver) {
    startGameSound();
    handleHorse();
    handleObstacles();
    checkCollisions();
  } else {
    stopGameSound();
    handleHorse(true); // afficher le cheval même après la collision
    handleObstacles(true);
    // Afficher l'image de collision si besoin
    if (collisionPoint) {
      let sz = 70;
      image(collisionImg, collisionPoint.x - sz/2, collisionPoint.y - sz/2, sz, sz);
    }
    textAlign(CENTER, CENTER);
    textSize(48);
    fill(255, 0, 0);
    if (lives <= 0) {
      text('Perdu', width / 2, height / 2);
    } else {
      text('Touché !', width / 2, height / 2);
    }
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
  text('Appuie sur 1, 2 ou 3', width / 2, height / 2 + 160);
}

function keyPressed() {
  if (level === 0) {
    if (key === '1') {
      level = 1;
      horseHitboxScale = 0.6;
      restartGame();
    } else if (key === '2') {
      level = 2;
      horseHitboxScale = 0.8;
      restartGame();
    } else if (key === '3') {
      level = 3;
      horseHitboxScale = 1.0;
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
    horseVY = -17;
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
      frameSinceLastObstacle = 0;
    }
    // Déplacement des obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= groundSpeed;
      if (obstacles[i].x + obstacles[i].w < 0) {
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
        if (lives <= 0) {
          gameOver = true;
        } else {
          gameOver = true;
          setTimeout(() => {
            gameOver = false;
            justHit = false;
            collisionPoint = null;
            // On retire l'obstacle touché
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

function restartGame() {
  obstacles = [];
  horseY = groundY - horse.h;
  horseVY = 0;
  isJumping = false;
  frameSinceLastObstacle = 0;
  gameOver = false;
  bgOffset = 0;
  collisionPoint = null; // Remettre à zéro au redémarrage
  lives = maxLives;
  justHit = false;
  startGameSound();
}
