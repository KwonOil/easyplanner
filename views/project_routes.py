# views/project_routes.py

from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user
from models import Project, Task, Comment
from datetime import datetime, timedelta

# 'project' 라는 이름의 블루프린트 객체를 생성합니다.
bp = Blueprint('project', __name__, url_prefix='/')

@bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('project.dashboard'))
    return redirect(url_for('auth.login')) # 'auth' 블루프린트로 이동

# 대시보드
@bp.route('/dashboard')
@login_required
def dashboard():
    user_projects = Project.find_for_user(current_user.id)
    assigned_tasks = Task.find_for_assignee(current_user.id)
    current_time_for_input = datetime.now().strftime('%Y-%m-%dT%H:%M')
    
    return render_template('dashboard.html',
                            projects=user_projects,
                            tasks=assigned_tasks,
                            current_time=current_time_for_input)

# 프로젝트 생성을 처리할 라우트를 새로 추가합니다.
@bp.route('/projects/create', methods=['POST'])
@login_required
def create_project():
    # '프로젝트 관리자'가 아니면 대시보드로 리디렉션
    if current_user.role != '프로젝트 관리자':
        flash('프로젝트를 생성할 권한이 없습니다.')
        return redirect(url_for('project.dashboard'))
    
    project_name = request.form.get('project_name')
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')

    if project_name:
        new_project = Project(id=None, project_name=project_name, created_by=current_user.id, start_date=start_date, end_date=end_date)
        new_project.create()
        flash('새로운 프로젝트가 생성되었습니다.')
    
    return redirect(url_for('project.dashboard'))

# 프로젝트 상세 페이지
@bp.route('/project/<int:project_id>', methods=['GET', 'POST'])
@login_required
def project_detail(project_id):
    # --- 권한 확인 로직
    if not Project.is_member(project_id, current_user.id):
        flash('접근 권한이 없는 프로젝트입니다.')
        return redirect(url_for('project.dashboard'))
    
    project = Project.get(project_id)
    tasks = Task.find_for_project(project_id)
    
    task_progress = project.calculate_task_progress()
    time_progress = project.calculate_time_progress()

    current_time_for_input = datetime.now().strftime('%Y-%m-%dT%H:%M')
    user_role = Project.get_user_role(project_id, current_user.id)

    return render_template('project_detail.html', 
                            project=project, 
                            tasks=tasks, 
                            task_progress=task_progress, 
                            time_progress=time_progress,
                            current_time=current_time_for_input,
                            user_role=user_role)

# 프로젝트 삭제
@bp.route('/projects/<int:project_id>/delete', methods=['POST'])
@login_required
def delete_project(project_id):
    project = Project.get(project_id)
    if not project:
        return "프로젝트를 찾을 수 없습니다.", 404
    
    # --- 권한 확인 로직
    # 현재 사용자가 프로젝트 생성자인지 확인
    if current_user.id != project.created_by:
        flash('프로젝트를 삭제할 권한이 없습니다.')
        # dashboard로 리디렉션
        return redirect(url_for('project.dashboard')) 

    project.delete()
    flash(f"'{project.project_name}' 프로젝트가 성공적으로 삭제되었습니다.")
    return redirect(url_for('project.dashboard'))

# 작업 생성
@bp.route('/project/<int:project_id>/tasks/create', methods=['POST'])
@login_required
def create_task(project_id):
    # --- 권한 확인 로직
    if not Project.is_member(project_id, current_user.id):
        # 실패 시 JSON으로 에러 메시지 반환
        return jsonify({"success": False, "message": "권한이 없습니다."}), 403
    
    task_name = request.form.get('task_name')
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')

    if not task_name or not start_date or not end_date:
        return jsonify({"success": False, "message": "모든 필드를 입력해주세요."}), 400

    new_task = Task(id=None, project_id=project_id, task_name=task_name, start_date=start_date, end_date=end_date)
    # 이제 모델의 create 함수를 호출하고, 반환된 ID를 사용합니다.
    new_task_id = new_task.create()

    # 새로 생성된 작업의 정보를 JSON로 전달
    return jsonify({
        "success": True,
        "message": "새로운 작업이 추가되었습니다.",
        "task": {
            "id": new_task_id, # 새로 생성된 ID를 JSON에 추가
            "name": new_task.task_name,
            "start_date": new_task.start_date,
            "end_date": new_task.end_date,
            "status": new_task.status
        }
    })

# 작업 상태 변경
@bp.route('/tasks/<int:task_id>/update-status', methods=['POST'])
@login_required
def update_task_status(task_id):
    task = Task.get(task_id)
    if not task:
        return jsonify({'success': False, 'message': '작업을 찾을 수 없습니다.'}), 404
    
    # 권한 확인 로직
    if not Project.is_member(task.project_id, current_user.id):
        return jsonify({'success': False, 'message': '권한이 없습니다.'}), 403

    new_status = request.form.get('status')
    if new_status:
        task.update_status(new_status)
        # 성공 시, 새로운 상태를 JSON으로 반환
        return jsonify({'success': True, 'new_status': new_status})
    
    return jsonify({'success': False, 'message': '새로운 상태 값이 없습니다.'}), 400

# 작업 삭제
@bp.route('/tasks/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    task = Task.get(task_id)
    if not task:
        return jsonify({'success': False, 'message': '작업을 찾을 수 없습니다.'}), 404
    
    # --- 권한 확인 로직
    if not Project.is_member(task.project_id, current_user.id):
        return jsonify({'success': False, 'message': '삭제할 권한이 없습니다.'}), 403

    project_id = task.project_id
    task.delete()
    flash('작업이 삭제되었습니다.')
    return jsonify({'success': True, 'message': '작업이 삭제되었습니다.'})

# Chart.js 데이터
@bp.route('/api/project/<int:project_id>/chartjs-data')
@login_required
def project_chartjs_data(project_id):
    if not Project.is_member(project_id, current_user.id):
        return jsonify({"error": "접근 권한이 없습니다."}), 403

    project = Project.get(project_id)
    tasks = Task.find_for_project(project_id)

    labels = []
    data = []
    background_colors = []
    border_colors = []

    # 프로젝트 데이터 추가
    project_label = f'[프로젝트] {project.project_name}'
    labels.append(project_label)
    data.append({'x': [project.start_date, project.end_date], 'y': project_label})
    background_colors.append('rgba(54, 162, 235, 0.6)')
    border_colors.append('rgba(54, 162, 235, 1)')

    # 작업 데이터 추가
    for task in tasks:
        if task.start_date and task.end_date:
            labels.append(task.task_name)
            data.append({'x': [task.start_date, task.end_date], 'y': task.task_name})
            background_colors.append('rgba(75, 192, 192, 0.6)')
            border_colors.append('rgba(75, 192, 192, 1)')
    
    # 하나의 데이터셋으로 최종 데이터 구성
    final_data = {
        'labels': labels,
        'datasets': [{
            'data': data,
            'backgroundColor': background_colors,
            'borderColor': border_colors,
            'borderWidth': 1,
            'borderRadius': 2,
            'borderSkipped': False
        }]
    }
    return jsonify(final_data)

# 댓글
@bp.route('/api/task/<int:task_id>/comments')
@login_required
def get_comments(task_id):
    comments = Comment.find_for_task(task_id)
    comments_list = []
    for c in comments:
        # DB에서 가져온 UTC 시간 문자열을 datetime 객체로 변환
        utc_time = datetime.strptime(c.created_at, '%Y-%m-%d %H:%M:%S')
        # KST로 변환 (+9 시간)
        kst_time = utc_time + timedelta(hours=9)
        
        comments_list.append({
            'id': c.id,
            'username': c.username,
            'content': c.content,
            'created_at': kst_time.strftime('%Y-%m-%d %H:%M:%S') # 변환된 KST 시간을 전달
        })
    return jsonify(comments_list)

# 댓글 추가
@bp.route('/api/task/<int:task_id>/comments/add', methods=['POST'])
@login_required
def add_comment(task_id):
    content = request.form.get('content')
    if not content:
        return jsonify({'success': False, 'message': '댓글 내용이 없습니다.'}), 400
    
    # KST 대신 UTC 시간을 직접 생성하여 문자열로 변환
    now_utc_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    new_comment_id = Comment.create(task_id, current_user.id, content, now_utc_str)

    return jsonify({
        'success': True,
        'comment': {
            'id': new_comment_id,
            'username': current_user.username,
            'content': content,
            # 화면에 바로 보여줄 시간은 KST로 변환 (+9 시간)
            'created_at': (datetime.utcnow() + timedelta(hours=9)).strftime('%Y-%m-%d %H:%M:%S')
        }
    })

# 댓글 삭제
@bp.route('/api/comments/<int:comment_id>/delete', methods=['POST'])
@login_required
def delete_comment(comment_id):
    comment = Comment.get(comment_id)
    if not comment:
        return jsonify({'success': False, 'message': '댓글이 존재하지 않습니다.'}), 404

    # 1. 댓글이 속한 작업(Task) 정보를 가져옵니다.
    task = Task.get(comment['task_id'])
    if not task:
        return jsonify({'success': False, 'message': '관련 작업을 찾을 수 없습니다.'}), 404
    
    # 2. 작업 정보에서 프로젝트 ID를 가져옵니다.
    project_id = task.project_id
    
    # 3. 현재 사용자의 프로젝트 내 역할을 확인합니다.
    user_role = Project.get_user_role(project_id, current_user.id)

    # 4. 새로운 권한 확인: (내가 쓴 댓글인가?) OR (내가 팀장인가?)
    if comment['user_id'] == current_user.id or user_role == '팀장':
        Comment.delete(comment_id)
        return jsonify({'success': True, 'message': '댓글이 삭제되었습니다.'})
    else:
        # 두 조건 모두 아니라면 권한 없음 에러를 반환합니다.
        return jsonify({'success': False, 'message': '삭제할 권한이 없습니다.'}), 403

# 프로젝트 상태 조회
@bp.route('/api/project/<int:project_id>/stats')
@login_required
def get_project_stats(project_id):
    # 권한 확인
    if not Project.is_member(project_id, current_user.id):
        return jsonify({"error": "접근 권한이 없습니다."}), 403
    
    project = Project.get(project_id)
    if not project:
        return jsonify({"error": "프로젝트를 찾을 수 없습니다."}), 404

    # 최신 태스크 진행률 계산
    task_progress = project.calculate_task_progress()
    
    return jsonify({'task_progress': task_progress})

# 프로젝트 상태 변경
@bp.route('/api/project/<int:project_id>/edit', methods=['POST'])
@login_required
def edit_project(project_id):
    project = Project.get(project_id)
    if not project or project.created_by != current_user.id:
        return jsonify({'success': False, 'message': '수정할 권한이 없습니다.'}), 403

    name = request.form.get('project_name')
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')

    if not all([name, start_date, end_date]):
        return jsonify({'success': False, 'message': '모든 필드를 입력해주세요.'}), 400

    project.update(name, start_date, end_date)
    return jsonify({
        'success': True,
        'project': {
            'name': name,
            'start_date': start_date,
            'end_date': end_date
        }
    })

# 작업 상태 변경
@bp.route('/api/task/<int:task_id>/edit', methods=['POST'])
@login_required
def edit_task(task_id):
    task = Task.get(task_id)
    # 권한 확인: 이 작업이 속한 프로젝트의 멤버인지 확인
    if not task or not Project.is_member(task.project_id, current_user.id):
        return jsonify({'success': False, 'message': '수정할 권한이 없습니다.'}), 403

    name = request.form.get('task_name')
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')

    if not all([name, start_date, end_date]):
        return jsonify({'success': False, 'message': '모든 필드를 입력해주세요.'}), 400

    task.update(name, start_date, end_date)
    
    return jsonify({
        'success': True,
        'task': {
            'name': name,
            'start_date': start_date,
            'end_date': end_date
        }
    })