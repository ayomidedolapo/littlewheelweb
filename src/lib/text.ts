export const fileTextColors = [
  "text-[#3B82F6]", // Blue
  "text-[#10B981]", // Green
  "text-[#8B5CF6]", // Purple
  "text-[#EC4899]", // Pink
  "text-[#EF4444]", // Red
  "text-[#F97316]", // Orange
];

export function extractFirstLetters(
  inputString?: string,
  limit: number = Infinity
): string {
  if (!inputString?.trim() || limit <= 0) {
    return ""; // Return empty string for empty input or non-positive limit
  }

  const words: string[] = inputString.trim().split(" ");
  let result: string = "";

  for (let i = 0; i < words.length && i < limit; i++) {
    result += words[i].charAt(0).toUpperCase();
  }

  return result;
}

export function sentenceCase(
  text: string,
  excludeWords?: boolean,
  limit: number = -1,
  additionalExcludedWords: string[] = []
): string {
  if (!text) {
    return "";
  } else {
    let words: string[] = text.split(" ");

    // If limit is specified and greater than 0, slice the words array
    if (limit > 0) {
      words = words.slice(0, limit);
    }

    if (excludeWords) {
      // List of default words to exclude from capitalization
      const defaultExcludedWords: string[] = [
        "a",
        "an",
        "the",
        "of",
        "for",
        "and",
        "but",
        "or",
        "nor",
        "on",
        "at",
        "to",
        "by",
        "with",
        "as",
      ];
      // Merge default excluded words with additional excluded words
      const excludedWords: string[] = [
        ...defaultExcludedWords,
        ...additionalExcludedWords,
      ];

      // Capitalize the first letter of each word that is not in the excluded list
      const capitalizedWords: string[] = [];
      words.map((word) => {
        // Ensure word is not empty
        if (word.length > 0) {
          // Capitalize if not in excluded list or if it's the first word
          if (
            excludedWords.indexOf(word.toLowerCase()) === -1 ||
            capitalizedWords.length === 0
          ) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          } else {
            return word.toLowerCase(); // Preserve excluded words
          }
        } else {
          return word; // Preserve empty words
        }
      });

      // Join the words back into a sentence
      return capitalizedWords.join(" ");
    } else {
      // If exclusion is disabled, simply capitalize each word
      return words
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }
  }
}

// Example usage:
const inputText: string = "love smith IS aN exAMPle OF SenTENCE";
console.log(sentenceCase(inputText)); // Output: Love Smith is an Example of Sentence
console.log(sentenceCase(inputText, false)); // Output: Love Smith Is An Example Of Sentence
console.log(sentenceCase(inputText, true, 3)); // Output: Love Smith Is An
console.log(sentenceCase(inputText, true, -1, ["is"])); // Output: Love Smith is an Example of Sentence

export function pascalToSentence(pascalStr: string): string {
  // Add space before each capital letter, but avoid adding space at the start
  const sentence = pascalStr.replace(/([A-Z])/g, " $1").trim();
  // Capitalize the first letter and convert the rest to lower case
  return sentence.charAt(0).toUpperCase() + sentence.slice(1).toLowerCase();
}

// Example usage
// const examples = ["fullName", "dateOfBirth", "businessAddress"];
