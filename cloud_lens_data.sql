-- ======================
-- 用户表（支持第三方登录 + 后期邮箱密码）
-- ======================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 登录方式
  provider TEXT NOT NULL,               -- 'github' | 'google' | 'email'
  provider_id TEXT,                     -- 第三方唯一ID
  
  -- 用户信息
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  
  -- 邮箱密码登录用（可选）
  password_hash TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ======================
-- 图片表
-- ======================
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  imgur_url TEXT NOT NULL,
  delete_hash TEXT,                     -- Imgur 删除用
  filename TEXT,
  size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);


-- ======================
-- 会话表（简单版，用 Cookie + Session）
-- ======================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                  -- session token
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);