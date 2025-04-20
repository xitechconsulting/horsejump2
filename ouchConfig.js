// Ce module JS va parser le fichier ouch.cfg et fournir un tableau de plages temporelles utilisables dans sketch.js
export async function loadOuchConfig(cfgPath) {
  // Lecture du fichier texte
  const response = await fetch(cfgPath);
  const text = await response.text();
  // Parsing des lignes non vides
  return text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [start, end] = line.split(';').map(Number);
      return { start, end };
    });
}
