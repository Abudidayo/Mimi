export const ACTION_LABEL_PREFIX = "[[action-label:";

export function encodeActionPrompt(label: string, prompt: string) {
  return `${ACTION_LABEL_PREFIX}${label.trim()}]]\n${prompt.trim()}`;
}

export function decodeActionPrompt(text: string | undefined) {
  if (!text || !text.startsWith(ACTION_LABEL_PREFIX)) {
    return {
      displayText: text ?? "",
      promptText: text ?? "",
    };
  }

  const closeIndex = text.indexOf("]]");
  if (closeIndex === -1) {
    return {
      displayText: text,
      promptText: text,
    };
  }

  const label = text.slice(ACTION_LABEL_PREFIX.length, closeIndex).trim();
  const promptText = text.slice(closeIndex + 2).trim();

  return {
    displayText: label || promptText,
    promptText,
  };
}
