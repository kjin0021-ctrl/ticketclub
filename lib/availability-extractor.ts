export interface ExtractedAvailability {
  availableFrom?: string;
  mustReturnBy?: string;
  origin?: string;
}

function validLocal(year: number, month: number, day: number, hour: number, minute: number) {
  const date = new Date(year, month - 1, day, hour, minute);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function localValue(year: number, month: number, day: number, hour: number, minute: number) {
  return validLocal(year, month, day, hour, minute) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` : undefined;
}

export function extractAvailabilityFromText(text: string, referenceYear: number): ExtractedAvailability {
  const normalized = text.normalize("NFKC");
  const matches: string[] = [];
  const pattern = /(?:(20\d{2})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日[^,，。;；\n]{0,24}?(上午|下午|晚上|早上|中午)?\s*(\d{1,2})(?::|点|時|时)([0-5]\d)?/g;
  for (const match of normalized.matchAll(pattern)) {
    let hour = Number(match[5]);
    if (/下午|晚上/.test(match[4] ?? "") && hour < 12) hour += 12;
    if (/上午|早上/.test(match[4] ?? "") && hour === 12) hour = 0;
    const value = localValue(Number(match[1] ?? referenceYear), Number(match[2]), Number(match[3]), hour, Number(match[6] ?? 0));
    if (value) matches.push(value);
  }
  if (!matches.length) {
    const isoPattern = /(20\d{2})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):([0-5]\d)/g;
    for (const match of normalized.matchAll(isoPattern)) {
      const value = localValue(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5]));
      if (value) matches.push(value);
    }
  }
  const originMap: Array<[RegExp, string]> = [[/墨尔本|Melbourne/i, "Melbourne CBD"], [/悉尼|Sydney/i, "Sydney CBD"], [/布里斯班|Brisbane/i, "Brisbane CBD"], [/奥克兰|Auckland/i, "Auckland CBD"], [/新加坡|Singapore/i, "Singapore"]];
  const origin = originMap.find(([pattern]) => pattern.test(normalized))?.[1];
  return { availableFrom: matches[0], mustReturnBy: matches[1], origin };
}
