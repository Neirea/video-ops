export default function getIframeLink(origin: string, url: string) {
    return `<iframe src="${origin}/embed/${url}" width="640" height="360"></iframe>`;
}
