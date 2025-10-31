// utils/text.ts

export const formatAIResponse = (text: string): string => {
    if (!text) return '';
    // Removes markdown for bolding and unordered list items starting with '*'
    return text
        .replace(/\*\*/g, '')
        .replace(/^\s*\*\s+/gm, '');
};
