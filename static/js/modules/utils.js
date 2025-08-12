// static/js/modules/utils.js (새 파일)

/**
 * 페이지 로드 시 URL 파라미터를 확인하여 콘솔에 메시지를 출력하고,
 * URL에서 메시지 파라미터를 제거하여 주소를 깔끔하게 정리합니다.
 */
export function handlePageLoadMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');

    if (message) {
        console.log('서버 메시지:', message);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}