// static/js/modules/commentHandler.js (수정 후 전체 코드)

// -----------------------------------------------------------------------------
// 1. 다른 모듈에서 사용할 수 있도록 모든 함수를 내보냅니다(export).
// -----------------------------------------------------------------------------

/**
 * 특정 작업에 대한 댓글 목록을 서버에서 불러와 화면에 표시합니다.
 */
export function loadComments(taskId, commentListElement) {
    const currentUser = document.querySelector('[data-current-user]').dataset.currentUser;
    const currentUserRole = document.querySelector('[data-user-role]').dataset.userRole;

    fetch(`/api/task/${taskId}/comments`)
        .then(response => response.json())
        .then(comments => {
            commentListElement.innerHTML = ''; // 기존 목록 비우기
            if (comments.length === 0) {
                commentListElement.innerHTML = '<li>작성된 댓글이 없습니다.</li>';
            } else {
                comments.forEach(comment => {
                    const li = document.createElement('li');
                    let editControls = '';
                    // 현재 사용자가 댓글 작성자이거나 팀장일 경우 컨트롤 버튼 추가
                    if (currentUser === comment.username || currentUserRole === '팀장') {
                        editControls = `
                            <button class="edit-comment-btn">수정</button>
                            <button class="delete-comment-btn" data-comment-id="${comment.id}">삭제</button>
                        `;
                    }
                    li.innerHTML = `
                        <div class="comment-view-mode">
                            <span><strong>${comment.username}</strong>: <span class="comment-content">${comment.content}</span> <small>(${comment.created_at})</small></span>
                            <span>${editControls}</span>
                        </div>
                        <form class="edit-comment-form" data-comment-id="${comment.id}" style="display: none;">
                            <input type="text" name="content" value="${comment.content}" required>
                            <button type="submit">저장</button>
                            <button type="button" class="cancel-edit-comment-btn">취소</button>
                        </form>
                    `;
                    commentListElement.appendChild(li);
                });
            }
        });
}

/**
 * '댓글 추가' 폼 제출을 비동기식으로 처리합니다.
 */
export function addComment(form) {
    const taskId = form.closest('.task-details').dataset.taskId;
    const contentInput = form.querySelector('input[name="content"]');
    const formData = new FormData(form);

    fetch(`/api/task/${taskId}/comments/add`, { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const commentListElement = form.closest('.comment-section').querySelector('.comment-list');
                const noCommentLi = commentListElement.querySelector('li');
                if (noCommentLi && noCommentLi.innerText.includes('없습니다')) {
                    noCommentLi.remove();
                }
                
                // loadComments를 다시 호출하여 목록을 새로고침하는 것이 가장 간단하고 확실합니다.
                loadComments(taskId, commentListElement);
                contentInput.value = '';
            } else {
                alert('댓글 작성 실패: ' + data.message);
            }
        });
}

/**
 * '댓글 수정' 폼 제출을 비동기식으로 처리합니다.
 */
export function handleCommentEdit(form) {
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

/**
 * 댓글 삭제를 비동기식으로 처리합니다.
 */
export function deleteComment(commentId, listItemElement) {
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

/**
 * 댓글의 보기 모드와 수정 모드를 전환합니다.
 */
export function toggleCommentEditMode(commentLi, isEdit) {
    const viewMode = commentLi.querySelector('.comment-view-mode');
    const editForm = commentLi.querySelector('.edit-comment-form');

    if (viewMode && editForm) {
        viewMode.style.display = isEdit ? 'none' : '';
        editForm.style.display = isEdit ? 'flex' : 'none';
    }
}