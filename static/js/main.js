// --- 모든 모듈에서 필요한 함수들을 가져옵니다 ---
import { handlePageLoadMessages } from './modules/utils.js';
import { initializeCountdown } from './modules/countdown.js';
import { drawChart } from './modules/gantt.js';
import { setupProjectEventHandlers } from './modules/projectHandler.js';
import { setupTaskListEventHandlers } from './modules/taskHandler.js';

// --- 페이지가 로드되면 모든 기능을 초기화합니다 ---
document.addEventListener('DOMContentLoaded', () => {
    // 공통 기능 초기화
    handlePageLoadMessages();

    // 프로젝트 상세 페이지에서만 실행될 기능들
    if (document.getElementById('gantt_chart_div')) {
        initializeCountdown();
        drawChart();
        setupProjectEventHandlers();
        setupTaskListEventHandlers();
    } 
    // 대시보드 페이지에서만 실행될 기능들
    else if (document.getElementById('create-project-form')) {
        // (projectHandler.js에서 관련 이벤트 리스너를 가져와 설정할 수 있습니다)
    }
});