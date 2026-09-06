// Curated short quotations for practice "quote" mode. Deliberately restricted
// to characters the keyboard layouts can re-encode: plain sentence punctuation
// only — no em/en dashes, smart quotes, brackets or diacritics — so a picked
// quote is always typeable by QWERTY and by the Myanmar layout.

export interface Quote {
    text: string
    source: string
    language: 'english' | 'myanmar'
}

export const QUOTES: Quote[] = [
    // English
    { text: 'The only way to do great work is to love what you do.', source: 'Steve Jobs', language: 'english' },
    { text: 'Life is what happens when you are busy making other plans.', source: 'John Lennon', language: 'english' },
    { text: 'Do not watch the clock. Do what it does. Keep going.', source: 'Sam Levenson', language: 'english' },
    { text: 'The future belongs to those who believe in the beauty of their dreams.', source: 'Eleanor Roosevelt', language: 'english' },
    { text: 'Simplicity is the ultimate sophistication.', source: 'Leonardo da Vinci', language: 'english' },
    { text: 'It always seems impossible until it is done.', source: 'Nelson Mandela', language: 'english' },
    { text: 'Success is not final, failure is not fatal. It is the courage to continue that counts.', source: 'Winston Churchill', language: 'english' },
    { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', source: 'Chinese Proverb', language: 'english' },
    { text: 'Whether you think you can or you think you cannot, you are right.', source: 'Henry Ford', language: 'english' },
    { text: 'A journey of a thousand miles begins with a single step.', source: 'Lao Tzu', language: 'english' },
    { text: 'Quality is not an act. It is a habit.', source: 'Aristotle', language: 'english' },
    { text: 'There is no substitute for hard work.', source: 'Thomas Edison', language: 'english' },

    // Myanmar
    { text: 'စာပေသည် လူ့ဘဝရဲ့ အလင်းရောင်ပါ။', source: 'ပုံပြင်', language: 'myanmar' },
    { text: 'ပညာရှိတို့သည် စိတ်ရှည်ခြင်းကို ရတနာအဖြစ် ထားကြသည်။', source: 'ဆိုရိုး', language: 'myanmar' },
    { text: 'သင်ယူခြင်းသည် နေ့စဉ် လေ့ကျင့်ခြင်းဖြင့်သာ ဖြစ်မြောက်သည်။', source: 'ပညာတော်', language: 'myanmar' },
    { text: 'လူ့ဘဝတွင် အစား ဆား ထက် စိတ်ဓာတ် က ပို အရေးကြီးသည်။', source: 'ဆိုရိုး', language: 'myanmar' },
    { text: 'ကြိုးစားအားထုတ်မှုသည် အောင်မြင်မှု၏ သော့ချက်ဖြစ်သည်။', source: 'ပညာတော်', language: 'myanmar' },
    { text: 'အမှားမှ သင်ယူခြင်းသည် အသိဉာဏ်ကို တိုးပွားစေသည်။', source: 'ပုံပြင်', language: 'myanmar' },
    { text: 'တိတ်ဆိတ်ခြင်းသည် ရွှေဖြစ်သည်။', source: 'ဆိုရိုး', language: 'myanmar' },
]

export function quotePool(language: 'english' | 'myanmar'): Quote[] {
    return QUOTES.filter((q) => q.language === language)
}