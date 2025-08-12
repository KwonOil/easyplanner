// 1. 카운트다운 로직을 초기화하는 함수를 만듭니다.
function initializeCountdown() {
    const countdownElement = document.getElementById('countdown-timer');
    if (!countdownElement) return;

    // 2. 기존에 실행되던 타이머가 있다면 중지시킵니다.
    let intervalId = countdownElement.dataset.intervalId;
    if (intervalId) {
        clearInterval(parseInt(intervalId));
    }

    function updateCountdown() {
        // 3. data- 속성에서 날짜 값을 '매번 새로' 읽어옵니다.
        const startDateString = countdownElement.dataset.startDate;
        const endDateString = countdownElement.dataset.endDate;
        
        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);
        const now = new Date();

        let targetDate;
        let label;

        if (now < startDate) {
            targetDate = startDate;
            label = "시작까지: ";
        } else if (now < endDate) {
            targetDate = endDate;
            label = "D-day: ";
        } else {
            countdownElement.innerHTML = "프로젝트 종료";
            return;
        }

        const remainingTime = targetDate - now;

        if (remainingTime <= 0) {
            countdownElement.innerHTML = label === "D-day: " ? "프로젝트 종료" : "프로젝트 시작";
            return;
        }

        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

        const dayStr = days > 0 ? `${days}일 ` : '';
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        countdownElement.innerHTML = `${label}${dayStr}${timeStr}`;
    }
    
    // 4. 새로운 타이머를 시작하고, 그 ID를 저장합니다.
    const newIntervalId = setInterval(updateCountdown, 1000);
    countdownElement.dataset.intervalId = newIntervalId;
    updateCountdown(); // 즉시 한 번 실행
}

// 5. 페이지가 처음 로드될 때 카운트다운을 초기화합니다.
document.addEventListener('DOMContentLoaded', initializeCountdown);