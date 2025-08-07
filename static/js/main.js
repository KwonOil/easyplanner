document.addEventListener('DOMContentLoaded', () => {
    // 현재 로그인한 사용자 이름 가져오기
    const currentUser = document.querySelector('[data-current-user]')?.dataset.currentUser;

    // --- 새 작업 추가 폼 처리 ---
    const createTaskForm = document.getElementById('create-task-form');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', handleCreateTask);
    }
    
    // --- 작업 목록의 모든 이벤트를 한 곳에서 처리 ---
    const taskList = document.querySelector('.task-list');
    if (taskList) {
        // 'click' 이벤트 위임 (아코디언, 댓글 삭제)
        taskList.addEventListener('click', handleTaskListClick);
        // 'submit' 이벤트 위임 (댓글 추가)
        taskList.addEventListener('submit', handleTaskListSubmit);
        // 'change' 이벤트 위임 (상태 변경)
        taskList.addEventListener('change', handleTaskListChange);
    }
});

// --- 이벤트 핸들러 함수들 ---
function handleCreateTask(event) {
    event.preventDefault();
    const formData = new FormData(this);
    const url = this.action;

    fetch(url, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addTaskToList(data.task);
                this.reset();
                updateProjectStats();
            } else {
                alert('작업 추가 실패: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

function handleTaskListClick(event) {
    // 아코디언 열기/닫기
    const summary = event.target.closest('.task-summary');
    if (summary) {
        const details = summary.nextElementSibling;
        if (details && details.classList.contains('task-details')) {
            details.classList.toggle('visible');
            if (details.classList.contains('visible')) {
                const taskId = details.dataset.taskId;
                loadComments(taskId, details.querySelector('.comment-list'));
            }
        }
        return; // 다른 click 이벤트와 충돌 방지
    }

    // 댓글 삭제 버튼 클릭
    if (event.target.classList.contains('delete-comment-btn')) {
        const commentId = event.target.dataset.commentId;
        if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
            deleteComment(commentId, event.target.closest('li'));
        }
        return;
    }

    // --- '수정' 버튼 클릭 처리 ---
    if (event.target.classList.contains('edit-task-btn')) {
        const detailsDiv = event.target.closest('.task-details');
        toggleEditMode(detailsDiv, true);
    }

    // --- '취소' 버튼 클릭 처리 ---
    if (event.target.classList.contains('cancel-edit-btn')) {
        const detailsDiv = event.target.closest('.task-details');
        toggleEditMode(detailsDiv, false);
    }

    // --- 작업 삭제 버튼 클릭 처리 ---
    if (event.target.closest('.delete-task-form')) {
        event.preventDefault(); // form의 기본 동작 방지
        const form = event.target.closest('.delete-task-form');
        const listItem = form.closest('li');
        const url = form.action;

        if (confirm('정말로 이 작업을 삭제하시겠습니까?')) {
            fetch(url, { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        listItem.remove();
                        updateProjectStats();
                    } else {
                        alert('작업 삭제 실패: ' + data.message);
                    }
                })
                .catch(error => console.error('Error:', error));
        }
    }
}

function handleTaskListSubmit(event) {
    // 댓글 폼 제출
    if (event.target.classList.contains('comment-form')) {
        event.preventDefault();
        const form = event.target;
        const taskId = form.closest('.task-details').dataset.taskId;
        const contentInput = form.querySelector('input[name="content"]');
        
        addComment(taskId, contentInput.value, form.closest('.comment-section'));
        contentInput.value = '';
    }

    // --- '작업 수정 저장' 폼 제출 처리 ---
    if (event.target.classList.contains('edit-task-form')) {
        event.preventDefault();
        const form = event.target;
        const detailsDiv = form.closest('.task-details');
        const taskId = detailsDiv.dataset.taskId;
        const formData = new FormData(form);

        fetch(`/api/task/${taskId}/edit`, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 성공 시 UI 업데이트 후 보기 모드로 전환
                    // console.log(data.task);
                    updateTaskView(detailsDiv, data.task);
                    toggleEditMode(detailsDiv, false);
                    drawChart(); // 간트 차트 갱신
                } else {
                    alert('작업 수정 실패: ' + data.message);
                }
            });
    }

}

function handleTaskListChange(event) {
    // 상태 변경 select
    if (event.target.classList.contains('task-status-select')) {
        const detailsDiv = event.target.closest('.task-details');
        const taskId = detailsDiv.dataset.taskId;
        const newStatus = event.target.value;

        updateTaskStatus(taskId, newStatus, detailsDiv);
    }
}


// --- 기능 함수들 ---
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

function loadComments(taskId, commentListElement) {
    // 현재 사용자의 이름과 역할을 모두 가져옵니다.
    const currentUser = document.querySelector('[data-current-user]').dataset.currentUser;
    const currentUserRole = document.querySelector('[data-user-role]').dataset.userRole;

    fetch(`/api/task/${taskId}/comments`)
        .then(response => response.json())
        .then(comments => {
            commentListElement.innerHTML = '';
            if (comments.length === 0) {
                commentListElement.innerHTML = '<li>작성된 댓글이 없습니다.</li>';
            } else {
                comments.forEach(comment => {
                    const li = document.createElement('li');
                    let deleteBtn = '';
                    
                    // --- 새로운 권한 확인 로직 ---
                    // (내가 쓴 댓글인가?) OR (내가 팀장인가?)
                    if (currentUser === comment.username || currentUserRole === '팀장') {
                        deleteBtn = `<button class="delete-comment-btn" data-comment-id="${comment.id}">삭제</button>`;
                    }
                    li.innerHTML = `<span><strong>${comment.username}</strong>: ${comment.content} <small>(${comment.created_at})</small></span> ${deleteBtn}`;
                    commentListElement.appendChild(li);
                });
            }
        });
}

function addComment(taskId, content, commentSection) {
    const formData = new FormData();
    formData.append('content', content);
    fetch(`/api/task/${taskId}/comments/add`, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const commentListElement = commentSection.querySelector('.comment-list');
                const noCommentLi = commentListElement.querySelector('li');
                if (noCommentLi && noCommentLi.innerText.includes('없습니다')) {
                    noCommentLi.remove();
                }
                
                const li = document.createElement('li');
                const newComment = data.comment;
                // 새로 추가된 댓글은 항상 현재 사용자가 작성자이므로 삭제 버튼을 포함합니다.
                const deleteBtn = `<button class="delete-comment-btn" data-comment-id="${newComment.id}">삭제</button>`;
                li.innerHTML = `<span><strong>${newComment.username}</strong>: ${newComment.content} <small>(${newComment.created_at})</small></span> ${deleteBtn}`;
                commentListElement.appendChild(li);
            } else {
                alert('댓글 작성 실패: ' + data.message);
            }
        });
}

function deleteComment(commentId, listItemElement) {
    fetch(`/api/comments/${commentId}/delete`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                listItemElement.remove();
            } else {
                alert('댓글 삭제 실패: ' + data.message);
            }
        });
}

function updateProjectStats() {
    const chartCanvas = document.getElementById('gantt_chart_div');
    if (!chartCanvas) return;
    const projectId = chartCanvas.dataset.projectId;

    // 1. 새로운 진행률 정보를 API로부터 가져옵니다.
    fetch(`/api/project/${projectId}/stats`)
        .then(response => response.json())
        .then(stats => {
            if (stats.error) {
                console.error(stats.error);
                return;
            }

            // 2. 진행률 텍스트와 막대 바의 값을 업데이트합니다.
            const progressBar = document.getElementById('task-progress-bar');
            const progressText = document.getElementById('task-progress-text');
            
            if(progressBar) progressBar.value = stats.task_progress;
            if(progressText) progressText.textContent = `태스크 진행률: ${stats.task_progress}%`;
        })
        .catch(error => console.error('Error updating stats:', error));

    // 3. 간트 차트를 다시 그립니다.
    if (typeof drawChart === 'function') {
        drawChart();
    }
}

// --- 프로젝트 수정 모달 처리 ---
const editProjectBtn = document.getElementById('edit-project-btn');
const editProjectModal = document.getElementById('edit-project-modal');
const editProjectForm = document.getElementById('edit-project-form');

if (editProjectBtn) {
    editProjectBtn.addEventListener('click', () => {
        editProjectModal.showModal();
    });
}

if (editProjectForm) {
    editProjectForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const projectId = document.getElementById('gantt_chart_div').dataset.projectId;
        const formData = new FormData(editProjectForm);
        
        fetch(`/api/project/${projectId}/edit`, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 화면의 프로젝트 정보 업데이트
                    document.getElementById('project-title-display').textContent = `프로젝트: ${data.project.name}`;
                    // (기간, 카운트다운, 차트 등 다른 정보도 업데이트 필요)
                    
                    editProjectModal.close();
                    // 페이지를 새로고침하여 모든 변경사항(차트, 카운트다운 등)을 반영하는 것이 가장 간단합니다.
                    location.reload();
                } else {
                    alert('프로젝트 수정 실패: ' + data.message);
                }
            });
    });
}

// 보기/수정 모드를 전환하는 함수
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

// 수정된 내용으로 화면을 업데이트하는 함수
function updateTaskView(detailsDiv, task) {
    const startDate = task.start_date.replace('T', ' ');
    const endDate = task.end_date.replace('T', ' ');
    
    detailsDiv.closest('li').querySelector('.task-summary span').textContent = task.name;
    detailsDiv.querySelector('.task-dates').textContent = `${startDate} ~ ${endDate}`;
}