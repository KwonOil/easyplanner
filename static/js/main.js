// -----------------------------------------------------------------------------
// 1. 페이지가 로드되면 실행되는 메인 함수
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    handlePageLoadMessages();
    setupEventListeners();
});

// -----------------------------------------------------------------------------
// 2. 모든 이벤트 리스너를 설정하는 함수
// -----------------------------------------------------------------------------
function handlePageLoadMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        console.log('서버 메시지:', message);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function setupEventListeners() {
    // --- 프로젝트 관련 이벤트 ---
    const showCreateFormBtn = document.getElementById('show-create-form-btn');
    if (showCreateFormBtn) {
        showCreateFormBtn.addEventListener('click', toggleCreateProjectForm);
    }

    // '수정' 버튼 클릭 시 모달 열기
    const editProjectBtn = document.getElementById('edit-project-btn');
    const editProjectModal = document.getElementById('edit-project-modal');
    if (editProjectBtn) {
        editProjectBtn.addEventListener('click', () => editProjectModal.showModal());
    }

    // 모달 안의 'x' 닫기 버튼 클릭 시 모달 닫기
    const closeBtn = editProjectModal?.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (event) => {
            event.preventDefault(); // a 태그의 기본 동작 방지
            editProjectModal.close();
        });
    }

    // --- 프로젝트 수정 폼 이벤트 ---
    const editProjectForm = document.getElementById('edit-project-form');
    if (editProjectForm) {
        editProjectForm.addEventListener('submit', handleProjectEdit);
    }

    // --- 프로젝트 관리 폼 이벤트 ---
    const inviteMemberForm = document.getElementById('invite-member-form');
    if (inviteMemberForm) {
        inviteMemberForm.addEventListener('submit', handleInviteMember);
    }

    // --- 작업 추가 폼 이벤트 ---
    const createTaskForm = document.getElementById('create-task-form');
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', handleCreateTask);
    }

    // --- 작업 목록(Task List)의 모든 이벤트를 위임하여 처리 ---
    const taskList = document.querySelector('.task-list');
    if (taskList) {
        taskList.addEventListener('click', handleTaskListClick);
        taskList.addEventListener('submit', handleTaskListSubmit);
        taskList.addEventListener('change', handleTaskListChange);
    }
}

// -----------------------------------------------------------------------------
// 3. 이벤트 핸들러 함수들 (어떤 이벤트가 발생했는지 판단)
// -----------------------------------------------------------------------------
// 프로젝트 생성 폼 전환
function toggleCreateProjectForm() {
    const createProjectForm = document.getElementById('create-project-form');
    if (createProjectForm) {
        const isHidden = createProjectForm.style.display === 'none';
        createProjectForm.style.display = isHidden ? 'block' : 'none';
    }
}

// 프로젝트 수정
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
                document.getElementById('project-title-display').textContent = `프로젝트: ${data.project.name}`;
                const countdownElement = document.getElementById('countdown-timer');
                countdownElement.dataset.startDate = data.project.start_date;
                countdownElement.dataset.endDate = data.project.end_date;
                
                if (typeof initializeCountdown === 'function') initializeCountdown();
                if (typeof drawChart === 'function') drawChart();
                
                modal.close();
            } else {
                alert('프로젝트 수정 실패: ' + data.message);
            }
        });
}

// 프로젝트 관리
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

// 작업 추가
function handleCreateTask(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const url = form.action;

    fetch(url, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addTaskToList(data.task);
                form.reset();
                updateProjectStats();
            } else {
                alert('작업 추가 실패: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
}

// 작업 목록
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

// 작업 목록 이벤트
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

// 작업 목록 변경
function handleTaskListChange(event) {
    const select = event.target;

    if (select.classList.contains('task-status-select')) {
        updateTaskStatus(select);
    }
    else if (select.classList.contains('assignee-select')) {
        assignTask(select);
    }
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
                updateTaskView(detailsDiv, data.task);
                toggleEditMode(detailsDiv, false);
                drawChart();
            } else {
                alert('작업 수정 실패: ' + data.message);
            }
        });
}

// 댓글 추가
function handleCommentEdit(form) {
    const commentLi = form.closest('li');
    const commentId = form.dataset.commentId;
    
    fetch(`/api/comment/${commentId}/edit`, { method: 'POST', body: new FormData(form) })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            commentLi.querySelector('.comment-content').textContent = data.new_content;
            toggleCommentEditMode(commentLi, false);
        } else {
            alert('댓글 수정 실패: ' + data.message);
        }
    });
}

// -----------------------------------------------------------------------------
// 4. 실제 동작(AJAX 등)을 수행하는 기능 함수들
// -----------------------------------------------------------------------------
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

// 작업 상태 변경
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

// 댓글 추가
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

// 댓글 삭제
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

// 프로젝트 상태 업데이트
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

// 작업 상태 업데이트
function updateTaskView(detailsDiv, task) {
    const startDate = task.start_date.replace('T', ' ');
    const endDate = task.end_date.replace('T', ' ');
    
    detailsDiv.closest('li').querySelector('.task-summary span').textContent = task.name;
    detailsDiv.querySelector('.task-dates').textContent = `${startDate} ~ ${endDate}`;
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