export function createRecoveryPhrase() {
  return createRecoveryCode();
}

const recoveryCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRecoveryCode() {
  const randomValues = typeof globalThis.crypto?.getRandomValues === "function"
    ? globalThis.crypto.getRandomValues(new Uint32Array(16))
    : Array.from({ length: 16 }, () => Math.random() * 0xffffffff);
  const groups: string[] = [];
  for (let group = 0; group < 4; group += 1) {
    const characters: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const randomValue = randomValues[group * 4 + index];
      const randomIndex = randomValue % recoveryCodeAlphabet.length;
      characters.push(recoveryCodeAlphabet[randomIndex]);
    }
    groups.push(characters.join(""));
  }
  return groups.join("-");
}
