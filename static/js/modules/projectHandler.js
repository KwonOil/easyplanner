import { initializeCountdown } from './countdown.js';
import { drawChart } from './gantt.js';

// --- 프로젝트 관련 모든 이벤트 리스너를 설정하는 초기화 함수 ---
export function setupProjectEventHandlers() {
    // '새 프로젝트 생성' 버튼 이벤트
    const showCreateFormBtn = document.getElementById('show-create-form-btn');
    if (showCreateFormBtn) {
        showCreateFormBtn.addEventListener('click', toggleCreateProjectForm);
    }

    // 프로젝트 수정 모달 이벤트
    const editProjectModal = document.getElementById('edit-project-modal');
    if (editProjectModal) {
        const editProjectBtn = document.getElementById('edit-project-btn');
        if (editProjectBtn) {
            editProjectBtn.addEventListener('click', () => editProjectModal.showModal());
        }
        
        const closeBtn = editProjectModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                editProjectModal.close();
            });
        }
    }
    
    // 프로젝트 수정 폼 제출 이벤트
    const editProjectForm = document.getElementById('edit-project-form');
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', handleProjectEdit);
    }
    
    // 팀원 초대 폼 제출 이벤트
    const inviteMemberForm = document.getElementById('invite-member-form');
    if (inviteMemberForm) {
        inviteMemberForm.addEventListener('submit', handleInviteMember);
    }
}


// --- 이벤트 핸들러 및 기능 함수들 ---

function toggleCreateProjectForm() {
    const createProjectForm = document.getElementById('create-project-form');
    if (createProjectForm) {
        const isHidden = createProjectForm.style.display === 'none';
        createProjectForm.style.display = isHidden ? 'block' : 'none';
    }
}

function handleProjectEdit(event) {
    event.preventDefault();
    const form = event.target;
    const modal = document.getElementById('edit-project-modal');
    const projectId = document.getElementById('gantt_chart_div').dataset.projectId;
    const formData = new FormData(form);

    fetch(`/api/project/${projectId}/edit`, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 화면의 UI 요소들을 직접 업데이트
                document.getElementById('project-title-display').textContent = `프로젝트: ${data.project.name}`;
                const countdownElement = document.getElementById('countdown-timer');
                countdownElement.dataset.startDate = data.project.start_date;
                countdownElement.dataset.endDate = data.project.end_date;
                
                // 다른 모듈의 함수를 호출하여 화면 갱신
                initializeCountdown();
                drawChart();
                
                modal.close();
            } else {
                alert('프로젝트 수정 실패: ' + data.message);
            }
        });
}

function handleInviteMember(event) {
    event.preventDefault();
    const form = event.target;
    const projectId = document.getElementById('gantt_chart_div').dataset.projectId;
    const url = `/api/project/${projectId}/invite`;
    const formData = new FormData(form);

    fetch(url, { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            form.reset();
        }
    });
}

/**
 * 프로젝트 진행률과 차트를 업데이트합니다.
 * 이 함수는 taskHandler.js에서 호출될 수 있도록 export 합니다.
 */
export function updateProjectStats() {
    const chartCanvas = document.getElementById('gantt_chart_div');
    if (!chartCanvas) return;
    const projectId = chartCanvas.dataset.projectId;

    fetch(`/api/project/${projectId}/stats`)
        .then(response => response.json())
        .then(stats => {
            if (stats.error) {
                console.error(stats.error);
                return;
            }

            const progressBar = document.getElementById('task-progress-bar');
            const progressText = document.getElementById('task-progress-text');
            
            if(progressBar) progressBar.value = stats.task_progress;
            if(progressText) progressText.textContent = `태스크 진행률: ${stats.task_progress}%`;
        })
        .catch(error => console.error('Error updating stats:', error));

    drawChart();
}