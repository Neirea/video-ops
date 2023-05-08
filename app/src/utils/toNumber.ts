export default function toNumber(s: string | null) {
    if (s === null) return NaN;
    const parsedValue = parseFloat(s);
    return +s == parsedValue ? parsedValue : NaN;
}
