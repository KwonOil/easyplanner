# app.py (수정 후)

from flask import Flask
from flask_login import LoginManager
from models import User
from database import create_tables

# --- 블루프린트 파일들을 가져옵니다 ---
from views import auth_routes, project_routes

# --- Flask 앱 생성 및 기본 설정 ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'my-secret-key'

# --- 데이터베이스 초기화 명령어 설정 ---
@app.cli.command('init-db')
def init_db_command():
    create_tables()

# --- 로그인 매니저 설정 ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login' # 로그인 페이지 주소를 블루프린트 문법으로 변경

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

# --- 블루프린트 등록 ---
# 'auth'와 'project' 블루프린트를 메인 앱에 연결합니다.
app.register_blueprint(auth_routes.bp)
app.register_blueprint(project_routes.bp)

# --- 서버 실행 ---
if __name__ == '__main__':
    app.run(debug=True)