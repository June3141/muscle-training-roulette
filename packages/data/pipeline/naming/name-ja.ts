/**
 * ベース名から日本語名を合成する。
 *
 * 617 件を手で書く代わりに、**語彙表から機械的に組む**（Issue #45 の案 A）。
 * 日本語のトレーニング用語は原語のカタカナ表記が慣習なので、語順どおりに繋げば読める。
 *
 * 器具と片手/両手は名前に入れない。軸なので（ADR 0002、ADR 0006）。
 *
 * 合成なので、珍しい種目ほど不自然になる。重みと同じで、**収束ではなく
 * 「明らかな誤りの除去」を目的に据える**（CLAUDE.md）。
 */
import { DROPPED_WORDS, PHRASES, TERMS } from "./terms.ts";

export interface JapaneseName {
  readonly nameJa: string;
  /** 語彙表に無かった語。**空でなければ名前は使えない。** */
  readonly missing: readonly string[];
}

/**
 * `X with Y` を「Y 付き X」にする。
 *
 * 語順どおりに繋ぐと「ベンチプレスウィズチェーン」になって読めない。
 * ベース名 615 件のうち 27 件がこの形。
 */
const WITH = " with ";

function translate(words: readonly string[]): {
  readonly text: string;
  readonly missing: string[];
} {
  const missing: string[] = [];
  const parts: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const phrase = PHRASES[`${words[index]} ${words[index + 1]}`];
    if (phrase !== undefined) {
      parts.push(phrase);
      index += 1;
      continue;
    }
    const word = words[index] ?? "";
    if (DROPPED_WORDS.has(word)) continue;
    const term = TERMS[word];
    if (term === undefined) missing.push(word);
    else parts.push(term);
  }
  return { text: parts.join(""), missing };
}

export function toNameJa(baseName: string): JapaneseName {
  const index = baseName.indexOf(WITH);
  if (index === -1) {
    const { text, missing } = translate(baseName.split(" "));
    return { nameJa: text, missing };
  }

  const head = translate(baseName.slice(0, index).split(" "));
  const tail = translate(baseName.slice(index + WITH.length).split(" "));
  return {
    nameJa: `${tail.text}付き${head.text}`,
    missing: [...head.missing, ...tail.missing],
  };
}
