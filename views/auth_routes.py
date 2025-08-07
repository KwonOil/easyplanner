# views/auth_routes.py

from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required
from models import User
from database import get_db

# 'auth' 라는 이름의 블루프린트 객체를 생성합니다.
bp = Blueprint('auth', __name__, url_prefix='/')

# --- 기존 app.py에서 가져온 라우트들 ---
# @app.route가 @bp.route로 바뀐 것에 주목하세요.

# 회원가입
@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        db.close()

        role = '프로젝트 관리자' if user_count == 0 else '팀원'

        new_user = User(id=None, username=username, password_hash=None, role=role)
        new_user.set_password(password)
        new_user.create()

        flash('회원가입이 완료되었습니다. 로그인해주세요.')
        return redirect(url_for('auth.login')) # url_for에 블루프린트 이름 'auth' 추가
    
    return render_template('register.html')

# 로그인
@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.find_by_username(username)

        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('project.dashboard')) # 'project' 블루프린트로 이동
        
        flash('사용자 이름 또는 비밀번호가 올바르지 않습니다.')
        return redirect(url_for('auth.login'))

    return render_template('login.html')

# 로그아웃
@bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('성공적으로 로그아웃되었습니다.')
    return redirect(url_for('auth.login'))