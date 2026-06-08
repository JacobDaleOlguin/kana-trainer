// Kana data. Each entry: { char, romaji: [accepted spellings], script, group }
// First romaji in the array is the "canonical" one shown to the user.

const HIRAGANA_BASIC = [
  ['あ', ['a']], ['い', ['i']], ['う', ['u']], ['え', ['e']], ['お', ['o']],
  ['か', ['ka']], ['き', ['ki']], ['く', ['ku']], ['け', ['ke']], ['こ', ['ko']],
  ['さ', ['sa']], ['し', ['shi', 'si']], ['す', ['su']], ['せ', ['se']], ['そ', ['so']],
  ['た', ['ta']], ['ち', ['chi', 'ti']], ['つ', ['tsu', 'tu']], ['て', ['te']], ['と', ['to']],
  ['な', ['na']], ['に', ['ni']], ['ぬ', ['nu']], ['ね', ['ne']], ['の', ['no']],
  ['は', ['ha']], ['ひ', ['hi']], ['ふ', ['fu', 'hu']], ['へ', ['he']], ['ほ', ['ho']],
  ['ま', ['ma']], ['み', ['mi']], ['む', ['mu']], ['め', ['me']], ['も', ['mo']],
  ['や', ['ya']], ['ゆ', ['yu']], ['よ', ['yo']],
  ['ら', ['ra']], ['り', ['ri']], ['る', ['ru']], ['れ', ['re']], ['ろ', ['ro']],
  ['わ', ['wa']], ['を', ['wo', 'o']],
  ['ん', ['n', 'nn']],
];

const HIRAGANA_DAKUTEN = [
  ['が', ['ga']], ['ぎ', ['gi']], ['ぐ', ['gu']], ['げ', ['ge']], ['ご', ['go']],
  ['ざ', ['za']], ['じ', ['ji', 'zi']], ['ず', ['zu']], ['ぜ', ['ze']], ['ぞ', ['zo']],
  ['だ', ['da']], ['ぢ', ['ji', 'di']], ['づ', ['zu', 'du']], ['で', ['de']], ['ど', ['do']],
  ['ば', ['ba']], ['び', ['bi']], ['ぶ', ['bu']], ['べ', ['be']], ['ぼ', ['bo']],
  ['ぱ', ['pa']], ['ぴ', ['pi']], ['ぷ', ['pu']], ['ぺ', ['pe']], ['ぽ', ['po']],
];

const KATAKANA_BASIC = [
  ['ア', ['a']], ['イ', ['i']], ['ウ', ['u']], ['エ', ['e']], ['オ', ['o']],
  ['カ', ['ka']], ['キ', ['ki']], ['ク', ['ku']], ['ケ', ['ke']], ['コ', ['ko']],
  ['サ', ['sa']], ['シ', ['shi', 'si']], ['ス', ['su']], ['セ', ['se']], ['ソ', ['so']],
  ['タ', ['ta']], ['チ', ['chi', 'ti']], ['ツ', ['tsu', 'tu']], ['テ', ['te']], ['ト', ['to']],
  ['ナ', ['na']], ['ニ', ['ni']], ['ヌ', ['nu']], ['ネ', ['ne']], ['ノ', ['no']],
  ['ハ', ['ha']], ['ヒ', ['hi']], ['フ', ['fu', 'hu']], ['ヘ', ['he']], ['ホ', ['ho']],
  ['マ', ['ma']], ['ミ', ['mi']], ['ム', ['mu']], ['メ', ['me']], ['モ', ['mo']],
  ['ヤ', ['ya']], ['ユ', ['yu']], ['ヨ', ['yo']],
  ['ラ', ['ra']], ['リ', ['ri']], ['ル', ['ru']], ['レ', ['re']], ['ロ', ['ro']],
  ['ワ', ['wa']], ['ヲ', ['wo', 'o']],
  ['ン', ['n', 'nn']],
];

const KATAKANA_DAKUTEN = [
  ['ガ', ['ga']], ['ギ', ['gi']], ['グ', ['gu']], ['ゲ', ['ge']], ['ゴ', ['go']],
  ['ザ', ['za']], ['ジ', ['ji', 'zi']], ['ズ', ['zu']], ['ゼ', ['ze']], ['ゾ', ['zo']],
  ['ダ', ['da']], ['ヂ', ['ji', 'di']], ['ヅ', ['zu', 'du']], ['デ', ['de']], ['ド', ['do']],
  ['バ', ['ba']], ['ビ', ['bi']], ['ブ', ['bu']], ['ベ', ['be']], ['ボ', ['bo']],
  ['パ', ['pa']], ['ピ', ['pi']], ['プ', ['pu']], ['ペ', ['pe']], ['ポ', ['po']],
];

function buildKana(pairs, script, group) {
  return pairs.map(([char, romaji]) => ({ char, romaji, script, group }));
}

const KANA = {
  hiraganaBasic: buildKana(HIRAGANA_BASIC, 'hiragana', 'basic'),
  hiraganaDakuten: buildKana(HIRAGANA_DAKUTEN, 'hiragana', 'dakuten'),
  katakanaBasic: buildKana(KATAKANA_BASIC, 'katakana', 'basic'),
  katakanaDakuten: buildKana(KATAKANA_DAKUTEN, 'katakana', 'dakuten'),
};

function getKanaSet({ hiragana, katakana, includeDakuten }) {
  const set = [];
  if (hiragana) {
    set.push(...KANA.hiraganaBasic);
    if (includeDakuten) set.push(...KANA.hiraganaDakuten);
  }
  if (katakana) {
    set.push(...KANA.katakanaBasic);
    if (includeDakuten) set.push(...KANA.katakanaDakuten);
  }
  return set;
}
