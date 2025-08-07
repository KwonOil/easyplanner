const countdownElement = document.getElementById('countdown-timer');
// 시작일과 종료일을 모두 가져옵니다.
const startDateString = countdownElement.dataset.startDate;
const endDateString = countdownElement.dataset.endDate;

function updateCountdown() {
    // Date 객체로 변환
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    const now = new Date();

    let targetDate;
    let label;

    // --- 조건부 로직 ---
    // 1. 현재 시간이 시작일보다 이전인 경우
    if (now < startDate) {
        targetDate = startDate;
        label = "시작까지 - ";
    // 2. 현재 시간이 종료일보다 이전인 경우 (진행 중)
    } else if (now < endDate) {
        targetDate = endDate;
        label = "D-day - ";
    // 3. 현재 시간이 종료일보다 이후인 경우
    } else {
        countdownElement.innerHTML = "프로젝트 종료";
        return;
    }

    // --- 시간 계산 및 표시 (공통 로직) ---
    const remainingTime = targetDate - now;

    if (remainingTime <= 0) {
        // 혹시 모를 오차를 위해 한 번 더 체크
        countdownElement.innerHTML = label === "D-day - " ? "프로젝트 종료" : "프로젝트 시작";
        return;
    }

    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    const dayStr = days > 0 ? `${days}일 ` : '';
    const timeStr = `${hours.toString().padStart(2, '0')}시간 ${minutes.toString().padStart(2, '0')}분 ${seconds.toString().padStart(2, '0')}초`;
    
    countdownElement.innerHTML = `${label}${dayStr}${timeStr}`;
}

// 1초마다 업데이트
setInterval(updateCountdown, 1000);
// 페이지 로드 시 즉시 실행
updateCountdown();