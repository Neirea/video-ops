export default function getIframeLink(url: string) {
    return ` <iframe src="${window.location.origin}/embed/${url}" frameborder="0" width="640" height="360"></iframe>`;
}
