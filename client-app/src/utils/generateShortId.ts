export default function generateShortId() {
    const uuid = crypto.randomUUID();
    const uuidBytes = new TextEncoder().encode(uuid.replace(/-/g, ""));
    let binaryString = "";
    uuidBytes.forEach((byte) => {
        binaryString += String.fromCharCode(byte);
    });
    const encoded = window.btoa(binaryString);
    return encoded.slice(0, 10);
}
