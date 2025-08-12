import { loadComments, addComment, handleCommentEdit, toggleCommentEditMode, deleteComment } from './commentHandler.js';
import { updateProjectStats } from './projectHandler.js';

// 작업 목록의 모든 이벤트를 처리하는 초기화 함수
export function setupTaskListEventHandlers() {
    const taskList = document.querySelector('.task-list');
    if (taskList) {
        taskList.addEventListener('click', handleTaskListClick);
        taskList.addEventListener('submit', handleTaskListSubmit);
        taskList.addEventListener('change', handleTaskListChange);
    }
}

// 작업 수정/삭제, 아코디언, 댓글 수정/삭제 버튼 클릭 처리
function handleTaskListClick(event) {
    const target = event.target;

    if (target.closest('.task-summary')) {
        toggleTaskAccordion(target.closest('.task-summary'));
    }
    else if (target.classList.contains('edit-task-btn')) {
        toggleEditMode(target.closest('.task-details'), true);
    }
    else if (target.classList.contains('cancel-edit-btn')) {
        toggleEditMode(target.closest('.task-details'), false);
    }
    else if (target.closest('.delete-task-form')) {
        event.preventDefault();
        if (confirm('정말로 이 작업을 삭제하시겠습니까?')) {
            deleteTask(target.closest('.delete-task-form'));
        }
    }
    else if (target.classList.contains('edit-comment-btn')) {
        toggleCommentEditMode(target.closest('li'), true);
    }
    else if (target.classList.contains('cancel-edit-comment-btn')) {
        toggleCommentEditMode(target.closest('li'), false);
    }
    else if (target.classList.contains('delete-comment-btn')) {
        if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
            deleteComment(target.dataset.commentId, target.closest('li'));
        }
    }
}

// 작업/댓글 수정 저장, 댓글 추가 폼 제출 처리
function handleTaskListSubmit(event) {
    event.preventDefault();
    const form = event.target;

    if (form.classList.contains('edit-task-form')) {
        handleTaskEdit(form);
    }
    else if (form.classList.contains('comment-form')) {
        addComment(form);
    }
    else if (form.classList.contains('edit-comment-form')) {
        handleCommentEdit(form);
    }
}

// 작업 상태 변경, 담당자 지정 처리
function handleTaskListChange(event) {
    const select = event.target;

    if (select.classList.contains('task-status-select')) {
        updateTaskStatus(select);
    }
    else if (select.classList.contains('assignee-select')) {
        assignTask(select);
    }
}


// --- 실제 기능 함수들 ---

// 작업 수정 모드로 전환
function toggleEditMode(detailsDiv, isEdit) {
    const viewMode = detailsDiv.querySelector('.view-mode');
    const editForm = detailsDiv.querySelector('.edit-task-form');

    if (isEdit) { // 수정 모드로 전환
        // console.log(detailsDiv.closest('li').querySelector('.task-summary span').textContent);
        const taskName = detailsDiv.closest('li').querySelector('.task-summary span').textContent;
        const [startDate, endDate] = detailsDiv.querySelector('.task-dates').textContent.split(' ~ ');
        
        editForm.querySelector('input[name="task_name"]').value = taskName;
        editForm.querySelector('input[name="start_date"]').value = startDate.trim();
        editForm.querySelector('input[name="end_date"]').value = endDate.trim();

        viewMode.style.display = 'none';
        editForm.style.display = 'block';
    } else { // 보기 모드로 전환
        viewMode.style.display = 'block';
        editForm.style.display = 'none';
    }
}

// 작업 상태 변경
function updateTaskView(detailsDiv, task) {
    const startDate = task.start_date.replace('T', ' ');
    const endDate = task.end_date.replace('T', ' ');
    
    // 요약 정보의 작업 이름 업데이트
    detailsDiv.closest('li').querySelector('.task-summary .task-name').textContent = task.name;
    // 상세 정보의 기간 텍스트 업데이트
    detailsDiv.querySelector('.view-mode .task-dates').textContent = `${startDate} ~ ${endDate}`;
}

// 작업 수정
function handleTaskEdit(form) {
    const detailsDiv = form.closest('.task-details');
    const taskId = detailsDiv.dataset.taskId;
    const formData = new FormData(form);

    fetch(`/api/task/${taskId}/edit`, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 성공 시 UI 업데이트 후 보기 모드로 전환
                updateTaskView(detailsDiv, data.task);
                toggleEditMode(detailsDiv, false);
                // 간트 차트 갱신
                if (typeof drawChart === 'function') {
                    drawChart();
                }
            } else {
                alert('작업 수정 실패: ' + data.message);
            }
        });
}

// 작업 목록
function toggleTaskAccordion(summaryElement) {
    const details = summaryElement.nextElementSibling;
    if (details && details.classList.contains('task-details')) {
        details.classList.toggle('visible');
        if (details.classList.contains('visible')) {
            const taskId = details.dataset.taskId;
            loadComments(taskId, details.querySelector('.comment-list'));
        }
    }
}

// 작업 삭제
function deleteTask(form) {
    const listItem = form.closest('li');
    const url = form.action;
    fetch(url, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                listItem.remove();
                updateProjectStats();
            } else {
                alert('작업 삭제 실패: ' + data.message);
            }
        });
}

// 작업 추가
function addTaskToList(task) {
    const taskList = document.querySelector('.task-list');
    const noTaskLi = taskList.querySelector('.no-tasks');
    if (noTaskLi) {
        noTaskLi.remove();
    }
    const template = document.getElementById('task-template');
    const clone = template.content.cloneNode(true);
    const startDate = task.start_date.replace('T', ' ');
    const endDate = task.end_date.replace('T', ' ');
    clone.querySelector('.task-name').textContent = task.name;
    clone.querySelector('.task-status').textContent = `상태: ${task.status}`;
    clone.querySelector('.task-details').dataset.taskId = task.id;
    clone.querySelector('.task-dates').textContent = `${startDate} ~ ${endDate}`;
    clone.querySelector('.update-status-form').action = `/tasks/${task.id}/update-status`;
    clone.querySelector('.delete-task-form').action = `/tasks/${task.id}/delete`;
    clone.querySelector(`select[name="status"] option[value="${task.status}"]`).selected = true;
    taskList.appendChild(clone);
}

// 작업 상태 변경
function updateTaskStatus(taskId, newStatus, detailsDiv) {
    const formData = new FormData();
    formData.append('status', newStatus);

    fetch(`/tasks/${taskId}/update-status`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 1. 요약 정보의 상태 텍스트를 업데이트
            const summaryDiv = detailsDiv.previousElementSibling;
            if (summaryDiv && summaryDiv.classList.contains('task-summary')) {
                const statusElement = summaryDiv.querySelector('small');
                statusElement.textContent = `상태: ${data.new_status}`;
            }

            // 2. 상세 보기의 select 드롭다운 메뉴의 값도 업데이트
            const selectElement = detailsDiv.querySelector('.task-status-select');
            if (selectElement) {
                selectElement.value = data.new_status;
            }

            // 3. 간트 차트도 업데이트
            if (typeof drawChart === 'function') {
                drawChart();
            }
        } else {
            alert('상태 변경 실패: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

// 담당자 지정
function assignTask(taskId, assigneeId, detailsDiv) {
    const formData = new FormData();
    formData.append('assignee_id', assigneeId);

    fetch(`/api/task/${taskId}/assign`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 성공 시, 보기 모드의 담당자 이름을 업데이트합니다.
            const assigneeNameElement = detailsDiv.querySelector('.assignee-name');
            if (assigneeNameElement) {
                assigneeNameElement.textContent = data.assignee_name;
            }
            alert(data.message);
        } else {
            alert('담당자 지정 실패: ' + data.message);
        }
    });
}