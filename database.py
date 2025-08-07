import sqlite3

DATABASE_NAME = 'planner.db'

def get_db():
    """데이터베이스 커넥션을 반환합니다."""
    conn = sqlite3.connect(DATABASE_NAME)
    return conn

def create_tables():
    """프로젝트에서 사용할 모든 테이블을 생성합니다."""
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. users 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')

    # 2. projects 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            created_by INTEGER,
            start_date TEXT,
            end_date TEXT,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')

    # 3. project_members 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS project_members (
            project_id INTEGER,
            user_id INTEGER,
            role TEXT NOT NULL, -- '팀장' 또는 '팀원' 역할을 저장할 컬럼 추가
            PRIMARY KEY (project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')

    # 4. tasks 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            task_name TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            status TEXT,
            assignee_id INTEGER,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (assignee_id) REFERENCES users (id)
        )
    ''')

    # 5. comments 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            user_id INTEGER,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()
    print("테이블이 성공적으로 생성되었습니다.")