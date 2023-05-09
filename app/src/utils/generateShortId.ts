export default function generateShortId() {
    const uuid = crypto.randomUUID();
    const uuidBytes = new TextEncoder().encode(uuid.replace(/-/g, ""));
    const encoded = window.btoa(String.fromCharCode(...uuidBytes));
    return encoded.slice(0, 10);
}
