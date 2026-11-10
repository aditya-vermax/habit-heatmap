export const EMOJI_PREFIX = "emoji:";

export const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Activity",
    emojis: "🏃 🚶 🧘 🏋️ 🚴 🏊 ⚽ 🏀 🎾 🥊 🧗 ⛹️ 🤸 🏓 🎯 🎮 🎨 🎸 🎹 🎧 🎤 📚 ✍️ 🧩".split(" "),
  },
  {
    label: "Food",
    emojis: "🍎 🥗 🥑 🥦 🍌 🍓 🥕 🍳 🥛 ☕ 🍵 💧 🍞 🥜 🍊 🍇 🍉 🥤 🍽️ 🍫 🍪 🥣 🫐 🍋".split(" "),
  },
  {
    label: "Nature",
    emojis: "🌱 🌿 🍀 🌸 🌻 🌳 🌞 🌙 ⭐ 🌈 ☀️ ⛅ 🌊 🔥 ❄️ 🐶 🐱 🦋 🐝 🐢 🌍 ⛰️ 🏕️ 🌴".split(" "),
  },
  {
    label: "Objects",
    emojis: "💼 💻 📱 📖 📝 🗓️ ⏰ 💡 🔑 🧹 🧺 🛏️ 🪥 🧴 💊 💰 🛒 🎁 📷 🔧 🎓 🧠 ✈️ 🏠".split(" "),
  },
  {
    label: "Faces",
    emojis: "😀 😊 😌 😎 🤓 🥳 😴 🤔 💪 🙏 👍 👏 ❤️ 🧡 💛 💚 💙 💜 🖤 💯 ✨ 🎉 🏆 🚀".split(" "),
  },
];

/** Pulls the first emoji out of arbitrary text (handles ZWJ sequences, flags, skin tones). */
export function firstEmoji(text: string): string | null {
  const parts: string[] =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment)
      : Array.from(text);
  return parts.find((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) ?? null;
}
