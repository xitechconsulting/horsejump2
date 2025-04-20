// Ce module JS permet de jouer un extrait d'un p5.SoundFile sans couper la bande son principale
globalThis.playOuchSound = function(ouchSound, segment) {
  if (!ouchSound || !segment) return;
  // On clone le buffer pour permettre la superposition
  let snd = new p5.SoundFile();
  snd.buffer = ouchSound.buffer;
  snd.play(0, 1, 1, segment.start, segment.end - segment.start);
};
