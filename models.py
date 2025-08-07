from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
from datetime import datetime

# --- User 클래스 ---
class User(UserMixin):
    def __init__(self, id, username, password_hash, role):
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.role = role
    
    # 비밀번호 설정
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # 비밀번호 확인
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # user_id로 사용자 찾기
    @staticmethod
    def get(user_id):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user_data = cursor.fetchone()
            if not user_data:
                return None
            return User(id=user_data[0], username=user_data[1], password_hash=user_data[2], role=user_data[3])
        finally:
            db.close()

    # 사용자 이름으로 사용자 찾기
    @staticmethod
    def find_by_username(username):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user_data = cursor.fetchone()
            if not user_data:
                return None
            return User(id=user_data[0], username=user_data[1], password_hash=user_data[2], role=user_data[3])
        finally:
            db.close()

    # 사용자 생성
    def create(self):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                (self.username, self.password_hash, self.role)
            )
            db.commit()
        finally:
            db.close()

# --- Project 클래스 ---
class Project:
    # 프로젝트 정보
    def __init__(self, id, project_name, created_by, start_date=None, end_date=None):
        self.id = id
        self.project_name = project_name
        self.created_by = created_by
        self.start_date = start_date
        self.end_date = end_date

    # 프로젝트 생성
    def create(self):
        """새로운 프로젝트를 DB에 추가하고, 생성자를 '팀장'으로 멤버에 추가합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO projects (project_name, created_by, start_date, end_date) VALUES (?, ?, ?, ?)",
                (self.project_name, self.created_by, self.start_date, self.end_date)
            )
            project_id = cursor.lastrowid
            
            # user_id와 함께 '팀장'이라는 role을 추가
            cursor.execute(
                "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
                (project_id, self.created_by, '팀장')
            )
            db.commit()
        finally:
            db.close()

    # 사용자의 권한 확인
    @staticmethod
    def get_user_role(project_id, user_id):
        """프로젝트 내에서 사용자의 역할을 반환합니다 (팀장, 팀원, 또는 None)."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
                (project_id, user_id)
            )
            result = cursor.fetchone()
            # 결과가 있으면 역할(예: '팀장')을 반환하고, 없으면 None을 반환합니다.
            return result[0] if result else None
        finally:
            db.close()

    # 프로젝트 정보 업데이트
    def update(self, name, start_date, end_date):
        """프로젝트 정보를 업데이트합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "UPDATE projects SET project_name = ?, start_date = ?, end_date = ? WHERE id = ?",
                (name, start_date, end_date, self.id)
            )
            db.commit()
        finally:
            db.close()

    # 사용자에게 할당된 프로젝트 찾기
    @staticmethod
    def find_for_user(user_id):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("""
                SELECT p.id, p.project_name, p.created_by, p.start_date, p.end_date
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                WHERE pm.user_id = ?
            """, (user_id,))
            projects_data = cursor.fetchall()
            return [Project(id=p[0], project_name=p[1], created_by=p[2], start_date=p[3], end_date=p[4]) for p in projects_data]
        finally:
            db.close()
    
    # 태스크 진행률 계산 함수
    def calculate_task_progress(self):
        """태스크 완료도를 기반으로 진행률을 계산합니다."""
        tasks = Task.find_for_project(self.id)
        if not tasks:
            return 0
        
        completed_tasks = [task for task in tasks if task.status == '완료']
        return round((len(completed_tasks) / len(tasks)) * 100)

    # 시간 진행률 계산 함수
    def calculate_time_progress(self):
        """프로젝트 기간을 기반으로 시간 진행률을 계산합니다."""
        if not self.start_date or not self.end_date:
            return 0

        # 문자열을 datetime 객체로 변환
        start = datetime.fromisoformat(self.start_date)
        end = datetime.fromisoformat(self.end_date)
        now = datetime.now()

        # 현재 시간이 시작 전이면 0%, 종료 후면 100%
        if now < start:
            return 0
        if now > end:
            return 100

        # 전체 기간과 경과 시간 계산
        total_duration = end - start
        elapsed_duration = now - start

        # 기간이 0일 경우(시작과 종료가 같음) 처리
        if total_duration.total_seconds() == 0:
            return 100
            
        return round((elapsed_duration / total_duration) * 100)
    
    # 프로젝트 정보 찾기
    @staticmethod
    def get(project_id):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
            p_data = cursor.fetchone()
            if not p_data:
                return None
            return Project(id=p_data[0], project_name=p_data[1], created_by=p_data[2], start_date=p_data[3], end_date=p_data[4])
        finally:
            db.close()

    # 프로젝트에 사용자 추가
    @staticmethod
    def is_member(project_id, user_id):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?",
                (project_id, user_id)
            )
            return cursor.fetchone() is not None
        finally:
            db.close()
    
    # 프로젝트 삭제
    def delete(self):
        """프로젝트를 DB에서 삭제합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            # ON DELETE CASCADE 설정 덕분에, 이 프로젝트를 참조하는
            # project_members, tasks, comments 데이터도 연쇄적으로 자동 삭제됩니다.
            cursor.execute("DELETE FROM projects WHERE id = ?", (self.id,))
            db.commit()
        finally:
            db.close()

# --- Task 클래스
class Task:
    # 작업 정보
    def __init__(self, id, project_id, task_name, status='대기', start_date=None, end_date=None, assignee_id=None):
        self.id = id
        self.project_id = project_id
        self.task_name = task_name
        self.status = status
        self.start_date = start_date
        self.end_date = end_date
        self.assignee_id = assignee_id

    # 작업 생성
    def create(self):
        """새로운 작업을 DB에 추가하고 ID를 반환합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO tasks (project_id, task_name, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
                (self.project_id, self.task_name, self.status, self.start_date, self.end_date)
            )
            new_id = cursor.lastrowid # ID 가져오기
            db.commit()
            return new_id # ID 반환
        finally:
            db.close()

    # 프로젝트에 관한 작업 찾기
    @staticmethod
    def find_for_project(project_id):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM tasks WHERE project_id = ?", (project_id,))
            tasks_data = cursor.fetchall()
            return [Task(id=t[0], project_id=t[1], task_name=t[2], 
                        start_date=t[3], end_date=t[4], status=t[5], 
                        assignee_id=t[6]) for t in tasks_data]
        finally:
            db.close()
    
    # 작업 정보 업데이트
    def update(self, name, start_date, end_date):
        """작업의 이름과 기간을 업데이트합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "UPDATE tasks SET task_name = ?, start_date = ?, end_date = ? WHERE id = ?",
                (name, start_date, end_date, self.id)
            )
            db.commit()
        finally:
            db.close()

    # 작업 상태 변경
    def update_status(self, new_status):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "UPDATE tasks SET status = ? WHERE id = ?",
                (new_status, self.id)
            )
            db.commit()
        finally:
            db.close()

    # 작업 삭제
    def delete(self):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = ?", (self.id,))
            db.commit()
        finally:
            db.close()

    # 작업 정보 찾기
    @staticmethod
    def get(task_id):
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            task_data = cursor.fetchone()
            if not task_data:
                return None
            return Task(id=task_data[0], project_id=task_data[1], task_name=task_data[2], 
                        start_date=task_data[3], end_date=task_data[4], status=task_data[5], 
                        assignee_id=task_data[6])
        finally:
            db.close()
    
    # 사용자에게 할당된 작업 찾기
    @staticmethod
    def find_for_assignee(user_id):
        """특정 사용자에게 할당된 모든 작업을 가져옵니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM tasks WHERE assignee_id = ?", (user_id,))
            tasks_data = cursor.fetchall()
            return [Task(id=t[0], project_id=t[1], task_name=t[2], 
                        start_date=t[3], end_date=t[4], status=t[5], 
                        assignee_id=t[6]) for t in tasks_data]
        finally:
            db.close()

# --- Comment 클래스
class Comment:
    def __init__(self, id, task_id, user_id, content, created_at, username=None):
        self.id = id
        self.task_id = task_id
        self.user_id = user_id
        self.content = content
        self.created_at = created_at
        self.username = username # 댓글 작성자의 이름을 함께 저장하기 위함

    @staticmethod
    def create(task_id, user_id, content, created_at):
        """새로운 댓글을 DB에 추가합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO comments (task_id, user_id, content, created_at) VALUES (?, ?, ?, ?)",
                (task_id, user_id, content, created_at)
            )
            db.commit()
            return cursor.lastrowid # 새로 생성된 댓글의 ID 반환
        finally:
            db.close()

    @staticmethod
    def find_for_task(task_id):
        """특정 작업에 달린 모든 댓글을 작성자 이름과 함께 가져옵니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            # comments 테이블과 users 테이블을 JOIN하여 사용자 이름을 함께 가져옵니다.
            cursor.execute("""
                SELECT c.id, c.task_id, c.user_id, c.content, c.created_at, u.username
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.task_id = ?
                ORDER BY c.created_at ASC
            """, (task_id,))
            comments_data = cursor.fetchall()
            return [Comment(id=c[0], task_id=c[1], user_id=c[2], content=c[3], created_at=c[4], username=c[5]) for c in comments_data]
        finally:
            db.close()

    @staticmethod
    def get(comment_id):
        """댓글 ID를 기반으로 댓글 정보를 가져옵니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
            c_data = cursor.fetchone()
            if not c_data:
                return None
            # Comment 객체를 반환하지 않고 간단한 딕셔너리로 반환해도 충분합니다.
            return {'id': c_data[0], 'task_id': c_data[1], 'user_id': c_data[2]}
        finally:
            db.close()

    @staticmethod
    def delete(comment_id):
        """댓글 ID를 기반으로 댓글을 삭제합니다."""
        db = get_db()
        try:
            cursor = db.cursor()
            cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
            db.commit()
        finally:
            db.close()