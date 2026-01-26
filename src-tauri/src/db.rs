// src-tauri/src/db.rs
use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::OnceCell;
use chrono::Datelike;

// 使用 OnceCell 创建全局的、懒加载的数据库连接
static DB_CONN: OnceCell<Mutex<Connection>> = OnceCell::new();

pub fn get_db() -> Result<&'static Mutex<Connection>> {
    DB_CONN.get_or_try_init(|| {
        // 优先使用应用数据目录，如果不可用则使用当前目录
        let db_path = if let Some(app_data_dir) = dirs::data_local_dir() {
            let app_dir = app_data_dir.join("mindmirror");
            // 确保目录存在
            std::fs::create_dir_all(&app_dir).ok();
            app_dir.join("mindmirror_local.db")
        } else {
            // 回退到当前目录（开发环境）
            PathBuf::from(".").join("mindmirror_local.db")
        };
        
        println!("📁 首次建立数据库连接，路径: {:?}", db_path.canonicalize().unwrap_or(db_path.clone()));
        
        let conn = Connection::open(db_path)?;
        
        // 创建 projects 表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // 创建 contacts 表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                title TEXT,                -- 职位/头衔
                notes TEXT,                -- 备注或背景信息
                tags TEXT,                 -- 逗号分隔的标签，如 '客户,技术,紧急'
                phone TEXT,                -- 电话（JSON数组格式，支持多个）
                email TEXT,                -- 邮箱
                address TEXT,              -- 地址
                company TEXT,              -- 单位名称
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // 为旧数据库添加新字段（如果不存在）
        let _ = conn.execute("ALTER TABLE contacts ADD COLUMN phone TEXT", []);
        let _ = conn.execute("ALTER TABLE contacts ADD COLUMN email TEXT", []);
        let _ = conn.execute("ALTER TABLE contacts ADD COLUMN address TEXT", []);
        let _ = conn.execute("ALTER TABLE contacts ADD COLUMN company TEXT", []);

        // 创建 projects_contacts 关联表 (多对多关系)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects_contacts (
                project_id INTEGER NOT NULL,
                contact_id INTEGER NOT NULL,
                role TEXT,                 -- 在此项目中的角色，如 '产品负责人','技术顾问'
                notes TEXT,                -- 在此项目中的特别备注
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (project_id, contact_id),           -- 联合主键，防止重复关联
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 创建 events 表（事件记录）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                event_date TEXT NOT NULL,
                project_id INTEGER,
                event_type TEXT,
                reminder_time TEXT,
                reminder_triggered INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            )",
            [],
        )?;
        
        // 为已存在的 events 表添加提醒字段（数据库迁移）
        let _ = conn.execute("ALTER TABLE events ADD COLUMN reminder_time TEXT", []);
        let _ = conn.execute("ALTER TABLE events ADD COLUMN reminder_triggered INTEGER DEFAULT 0", []);

        // 创建 events_contacts 关联表（事件-联系人多对多关系）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS events_contacts (
                event_id INTEGER NOT NULL,
                contact_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (event_id, contact_id),
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 创建 project_files 表（项目文件管理）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS project_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                file_type TEXT,
                version INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 创建 project_activities 表（项目活动管理）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS project_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                estimated_completion_date TEXT,
                status TEXT NOT NULL DEFAULT '待分配',
                activated_at DATETIME,
                paused_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 创建 activities_contacts 关联表（活动-负责人多对多关系）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS activities_contacts (
                activity_id INTEGER NOT NULL,
                contact_id INTEGER NOT NULL,
                assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (activity_id, contact_id),
                FOREIGN KEY (activity_id) REFERENCES project_activities(id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 创建 operation_logs 操作日志表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS operation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                entity_name TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                related_entities TEXT,
                project_id INTEGER,
                project_name TEXT,
                description TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // 创建操作日志索引
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_logs_created_at ON operation_logs(created_at)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_logs_entity ON operation_logs(entity_type, entity_id)", []);

        // 创建 summaries 总结表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS summaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                summary_type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                content TEXT NOT NULL,
                statistics TEXT,
                is_auto_generated INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // 创建总结索引
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_summaries_date ON summaries(start_date, end_date)", []);
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_summaries_type ON summaries(summary_type)", []);

        println!("✅ 数据库和表初始化成功！");
        Ok(Mutex::new(conn))
    })
}


// 为项目定义一个结构体，用于在Rust和前端（通过序列化）之间传递数据
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// 联系人结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: i32,
    pub name: String,
    pub title: Option<String>,      // 职位/头衔
    pub notes: Option<String>,      // 背景备注
    pub tags: Option<String>,       // 标签以逗号分隔的字符串存储
    pub phone: Option<String>,      // 电话（JSON数组格式，支持多个）
    pub email: Option<String>,      // 邮箱
    pub address: Option<String>,    // 地址
    pub company: Option<String>,    // 单位名称
    pub created_at: String,
    pub updated_at: String,
}

// 项目-联系人关联结构体（包含角色和项目特定备注）
// 注意：当前使用元组返回，此结构体保留供未来使用
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectContact {
    pub project_id: i32,
    pub contact_id: i32,
    pub role: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

// 事件结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: i32,
    pub title: String,
    pub description: Option<String>,
    pub event_date: String,
    pub project_id: Option<i32>,
    pub event_type: Option<String>,
    pub reminder_time: Option<String>,
    pub reminder_triggered: bool,
    pub created_at: String,
    pub updated_at: String,
}

// 带详细信息的事件（用于时间线展示）
#[derive(Debug, Serialize, Deserialize)]
pub struct EventWithDetails {
    pub event: Event,
    pub contacts: Vec<Contact>,
    pub project_name: Option<String>,
}

// 插入新项目
// 修改 insert_project 函数，使用全局连接
pub fn insert_project(name: &str, description: Option<&str>) -> Result<i64> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO projects (name, description) VALUES (?1, ?2)",
        &[name, description.unwrap_or("")],
    )?;
    
    let project_id = conn.last_insert_rowid();
    
    // 记录操作日志
    let now = chrono::Local::now();
    let desc = format!("{}，新增项目「{}」", now.format("%Y年%m月%d日 %H:%M"), name);
    
    conn.execute(
        "INSERT INTO operation_logs (operation_type, entity_type, entity_id, entity_name, description) 
         VALUES ('create', 'project', ?1, ?2, ?3)",
        rusqlite::params![project_id, name, desc],
    )?;
    
    Ok(project_id)
}

// 根据项目ID获取项目名称
pub fn get_project_name(project_id: i32) -> Result<String> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let name: String = conn.query_row(
        "SELECT name FROM projects WHERE id = ?1",
        [project_id],
        |row| row.get(0)
    )?;
    
    Ok(name)
}

// 查询所有项目
pub fn fetch_projects() -> Result<Vec<Project>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare("SELECT id, name, description, created_at, updated_at FROM projects ORDER BY updated_at DESC")?;
    let project_iter = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    
    let mut projects = Vec::new();
    for project in project_iter {
        projects.push(project?);
    }
    Ok(projects)
}


// 插入新联系人
pub fn insert_contact(
    name: &str,
    title: Option<&str>,
    notes: Option<&str>,
    tags: Option<&str>,
    phone: Option<&str>,
    email: Option<&str>,
    address: Option<&str>,
    company: Option<&str>,
) -> Result<i64> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO contacts (name, title, notes, tags, phone, email, address, company) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            name,
            title.unwrap_or(""),
            notes.unwrap_or(""),
            tags.unwrap_or(""),
            phone.unwrap_or(""),
            email.unwrap_or(""),
            address.unwrap_or(""),
            company.unwrap_or("")
        ],
    )?;
    
    let contact_id = conn.last_insert_rowid();
    
    // 记录操作日志
    let now = chrono::Local::now();
    let mut desc = format!("{}，新增联系人「{}」", now.format("%Y年%m月%d日 %H:%M"), name);
    if let Some(t) = tags {
        if !t.is_empty() {
            desc.push_str(&format!("，标签：{}", t));
        }
    }
    
    conn.execute(
        "INSERT INTO operation_logs (operation_type, entity_type, entity_id, entity_name, description) 
         VALUES ('create', 'contact', ?1, ?2, ?3)",
        rusqlite::params![contact_id, name, desc],
    )?;
    
    Ok(contact_id)
}


// 获取所有联系人
pub fn fetch_contacts() -> Result<Vec<Contact>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare("SELECT id, name, title, notes, tags, phone, email, address, company, created_at, updated_at FROM contacts ORDER BY updated_at DESC")?;
    let contact_iter = stmt.query_map([], |row| {
        Ok(Contact {
            id: row.get(0)?,
            name: row.get(1)?,
            title: row.get(2)?,
            notes: row.get(3)?,
            tags: row.get(4)?,
            phone: row.get(5)?,
            email: row.get(6)?,
            address: row.get(7)?,
            company: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    
    let mut contacts = Vec::new();
    for contact in contact_iter {
        contacts.push(contact?);
    }
    Ok(contacts)
}

// 将联系人与项目关联（包括角色和备注）
pub fn link_contact_to_project(project_id: i32, contact_id: i32, role: Option<&str>, notes: Option<&str>) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT OR REPLACE INTO projects_contacts (project_id, contact_id, role, notes) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![project_id, contact_id, role, notes],
    )?;
    Ok(())
}

// 获取项目关联的所有联系人
pub fn fetch_contacts_for_project(project_id: i32) -> Result<Vec<(Contact, Option<String>, Option<String>)>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.title, c.notes, c.tags, c.phone, c.email, c.address, c.company, c.created_at, c.updated_at, pc.role, pc.notes
         FROM contacts c
         INNER JOIN projects_contacts pc ON c.id = pc.contact_id
         WHERE pc.project_id = ?1
         ORDER BY pc.created_at DESC"
    )?;
    
    let results = stmt.query_map([project_id], |row| {
        Ok((
            Contact {
                id: row.get(0)?,
                name: row.get(1)?,
                title: row.get(2)?,
                notes: row.get(3)?,
                tags: row.get(4)?,
                phone: row.get(5)?,
                email: row.get(6)?,
                address: row.get(7)?,
                company: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            },
            row.get(11)?,  // role
            row.get(12)?,  // project-specific notes
        ))
    })?;
    
    let mut contacts = Vec::new();
    for result in results {
        contacts.push(result?);
    }
    Ok(contacts)
}

// 取消联系人与项目的关联
pub fn unlink_contact_from_project(project_id: i32, contact_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "DELETE FROM projects_contacts WHERE project_id = ?1 AND contact_id = ?2",
        rusqlite::params![project_id, contact_id],
    )?;
    Ok(())
}

// ==================== 事件相关函数 ====================

// 插入新事件，返回新创建的事件 ID
pub fn insert_event(
    title: &str,
    description: Option<&str>,
    event_date: &str,
    project_id: Option<i32>,
    event_type: Option<&str>,
    reminder_time: Option<&str>,
) -> Result<i64> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO events (title, description, event_date, project_id, event_type, reminder_time) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![title, description, event_date, project_id, event_type, reminder_time],
    )?;
    
    Ok(conn.last_insert_rowid())
}

// 记录事件创建日志（在关联联系人后调用）
pub fn log_event_creation(
    event_id: i64,
    title: &str,
    event_type: Option<&str>,
    project_id: Option<i32>,
    project_name: Option<&str>,
    contact_names: &[String],
) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let now = chrono::Local::now();
    let event_type_str = event_type.unwrap_or("事件");
    let mut desc = format!("{}，", now.format("%Y年%m月%d日 %H:%M"));
    
    if let Some(pname) = project_name {
        desc.push_str(&format!("对项目「{}」新增{}「{}」", pname, event_type_str, title));
    } else {
        desc.push_str(&format!("新增{}「{}」", event_type_str, title));
    }
    
    if !contact_names.is_empty() {
        desc.push_str(&format!("，涉及：{}", contact_names.join("、")));
    }
    
    conn.execute(
        "INSERT INTO operation_logs (operation_type, entity_type, entity_id, entity_name, project_id, project_name, description) 
         VALUES ('create', 'event', ?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![event_id, title, project_id, project_name, desc],
    )?;
    
    Ok(())
}

// 批量关联联系人到事件
pub fn link_contacts_to_event(event_id: i64, contact_ids: &[i32]) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    for contact_id in contact_ids {
        conn.execute(
            "INSERT OR IGNORE INTO events_contacts (event_id, contact_id) VALUES (?1, ?2)",
            rusqlite::params![event_id, contact_id],
        )?;
    }
    Ok(())
}

// 获取事件关联的所有联系人
pub fn fetch_contacts_for_event(event_id: i32) -> Result<Vec<Contact>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.title, c.notes, c.tags, c.phone, c.email, c.address, c.company, c.created_at, c.updated_at
         FROM contacts c
         INNER JOIN events_contacts ec ON c.id = ec.contact_id
         WHERE ec.event_id = ?1
         ORDER BY c.name"
    )?;
    
    let results = stmt.query_map([event_id], |row| {
        Ok(Contact {
            id: row.get(0)?,
            name: row.get(1)?,
            title: row.get(2)?,
            notes: row.get(3)?,
            tags: row.get(4)?,
            phone: row.get(5)?,
            email: row.get(6)?,
            address: row.get(7)?,
            company: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    
    let mut contacts = Vec::new();
    for result in results {
        contacts.push(result?);
    }
    Ok(contacts)
}

// 获取联系人的所有事件（时间线）
pub fn fetch_events_for_contact(contact_id: i32) -> Result<Vec<EventWithDetails>> {
    let (events, project_names) = {
        let db = get_db()?;
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        let mut stmt = conn.prepare(
            "SELECT DISTINCT e.id, e.title, e.description, e.event_date, e.project_id, e.event_type, e.reminder_time, e.reminder_triggered, e.created_at, e.updated_at
             FROM events e
             INNER JOIN events_contacts ec ON e.id = ec.event_id
             WHERE ec.contact_id = ?1
             ORDER BY e.event_date DESC"
        )?;
        
        let events: Vec<Event> = stmt.query_map([contact_id], |row| {
            Ok(Event {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                event_date: row.get(3)?,
                project_id: row.get(4)?,
                event_type: row.get(5)?,
                reminder_time: row.get(6)?,
                reminder_triggered: row.get::<_, i32>(7).unwrap_or(0) != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        // 获取项目名称映射
        let mut project_names: std::collections::HashMap<i32, String> = std::collections::HashMap::new();
        let mut p_stmt = conn.prepare("SELECT id, name FROM projects")?;
        let projects = p_stmt.query_map([], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
        })?;
        for p in projects {
            if let Ok((id, name)) = p {
                project_names.insert(id, name);
            }
        }
        
        (events, project_names)
    };
    
    // 组装详细信息
    let mut results = Vec::new();
    for event in events {
        let contacts = fetch_contacts_for_event(event.id)?;
        let project_name = event.project_id.and_then(|pid| project_names.get(&pid).cloned());
        results.push(EventWithDetails {
            event,
            contacts,
            project_name,
        });
    }
    
    Ok(results)
}

// 获取项目的所有事件（时间线）
pub fn fetch_events_for_project(project_id: i32) -> Result<Vec<EventWithDetails>> {
    let (events, project_name) = {
        let db = get_db()?;
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        // 获取项目名称
        let project_name: Option<String> = conn.query_row(
            "SELECT name FROM projects WHERE id = ?1",
            [project_id],
            |row| row.get(0)
        ).ok();
        
        let mut stmt = conn.prepare(
            "SELECT e.id, e.title, e.description, e.event_date, e.project_id, e.event_type, e.reminder_time, e.reminder_triggered, e.created_at, e.updated_at
             FROM events e
             WHERE e.project_id = ?1
             ORDER BY e.event_date DESC"
        )?;
        
        let events: Vec<Event> = stmt.query_map([project_id], |row| {
            Ok(Event {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                event_date: row.get(3)?,
                project_id: row.get(4)?,
                event_type: row.get(5)?,
                reminder_time: row.get(6)?,
                reminder_triggered: row.get::<_, i32>(7).unwrap_or(0) != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (events, project_name)
    };
    
    // 组装详细信息
    let mut results = Vec::new();
    for event in events {
        let contacts = fetch_contacts_for_event(event.id)?;
        results.push(EventWithDetails {
            event,
            contacts,
            project_name: project_name.clone(),
        });
    }
    
    Ok(results)
}

// 获取所有事件
pub fn fetch_all_events() -> Result<Vec<EventWithDetails>> {
    let (events, project_names) = {
        let db = get_db()?;
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        // 获取项目名称映射
        let mut project_names: std::collections::HashMap<i32, String> = std::collections::HashMap::new();
        let mut p_stmt = conn.prepare("SELECT id, name FROM projects")?;
        let projects = p_stmt.query_map([], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
        })?;
        for p in projects {
            if let Ok((id, name)) = p {
                project_names.insert(id, name);
            }
        }
        
        let mut stmt = conn.prepare(
            "SELECT e.id, e.title, e.description, e.event_date, e.project_id, e.event_type, e.reminder_time, e.reminder_triggered, e.created_at, e.updated_at
             FROM events e
             ORDER BY e.event_date DESC"
        )?;
        
        let events: Vec<Event> = stmt.query_map([], |row| {
            Ok(Event {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                event_date: row.get(3)?,
                project_id: row.get(4)?,
                event_type: row.get(5)?,
                reminder_time: row.get(6)?,
                reminder_triggered: row.get::<_, i32>(7).unwrap_or(0) != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (events, project_names)
    };
    
    // 组装详细信息
    let mut results = Vec::new();
    for event in events {
        let contacts = fetch_contacts_for_event(event.id)?;
        let project_name = event.project_id.and_then(|pid| project_names.get(&pid).cloned());
        results.push(EventWithDetails {
            event,
            contacts,
            project_name,
        });
    }
    
    Ok(results)
}

// 删除事件
pub fn delete_event(event_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute("DELETE FROM events WHERE id = ?1", [event_id])?;
    Ok(())
}

// ==================== 项目文件相关 ====================

// 项目文件结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectFile {
    pub id: i32,
    pub project_id: i32,
    pub original_name: String,
    pub stored_name: String,
    pub file_path: String,
    pub file_size: Option<i64>,
    pub file_type: Option<String>,
    pub version: i32,
    pub created_at: String,
    pub updated_at: String,
}

// 带项目名称的文件信息（用于全局搜索）
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFileWithProject {
    pub file: ProjectFile,
    pub project_name: String,
}

// 插入新文件记录
pub fn insert_project_file(
    project_id: i32,
    original_name: &str,
    stored_name: &str,
    file_path: &str,
    file_size: Option<i64>,
    file_type: Option<&str>,
    version: i32,
) -> Result<i64> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO project_files (project_id, original_name, stored_name, file_path, file_size, file_type, version) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![project_id, original_name, stored_name, file_path, file_size, file_type, version],
    )?;
    
    Ok(conn.last_insert_rowid())
}

// 获取项目的所有文件（按更新时间倒序）
pub fn fetch_files_for_project(project_id: i32) -> Result<Vec<ProjectFile>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, project_id, original_name, stored_name, file_path, file_size, file_type, version, created_at, updated_at
         FROM project_files
         WHERE project_id = ?1
         ORDER BY updated_at DESC"
    )?;
    
    let results = stmt.query_map([project_id], |row| {
        Ok(ProjectFile {
            id: row.get(0)?,
            project_id: row.get(1)?,
            original_name: row.get(2)?,
            stored_name: row.get(3)?,
            file_path: row.get(4)?,
            file_size: row.get(5)?,
            file_type: row.get(6)?,
            version: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    
    let mut files = Vec::new();
    for result in results {
        files.push(result?);
    }
    Ok(files)
}

// 获取文件的最新版本号
pub fn get_latest_file_version(project_id: i32, original_name: &str) -> Result<i32> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let version: rusqlite::Result<i32> = conn.query_row(
        "SELECT MAX(version) FROM project_files WHERE project_id = ?1 AND original_name = ?2",
        rusqlite::params![project_id, original_name],
        |row| row.get(0)
    );
    
    Ok(version.unwrap_or(0))
}

// 全局搜索文件（模糊匹配文件名）
pub fn search_files_global(keyword: &str) -> Result<Vec<ProjectFileWithProject>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let search_pattern = format!("%{}%", keyword);
    
    let mut stmt = conn.prepare(
        "SELECT f.id, f.project_id, f.original_name, f.stored_name, f.file_path, f.file_size, f.file_type, f.version, f.created_at, f.updated_at, p.name
         FROM project_files f
         INNER JOIN projects p ON f.project_id = p.id
         WHERE f.original_name LIKE ?1
         ORDER BY 
           CASE 
             WHEN f.original_name = ?2 THEN 1
             WHEN f.original_name LIKE ?3 THEN 2
             ELSE 3
           END,
           f.updated_at DESC"
    )?;
    
    let start_pattern = format!("{}%", keyword);
    
    let results = stmt.query_map(rusqlite::params![search_pattern, keyword, start_pattern], |row| {
        Ok(ProjectFileWithProject {
            file: ProjectFile {
                id: row.get(0)?,
                project_id: row.get(1)?,
                original_name: row.get(2)?,
                stored_name: row.get(3)?,
                file_path: row.get(4)?,
                file_size: row.get(5)?,
                file_type: row.get(6)?,
                version: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            },
            project_name: row.get(10)?,
        })
    })?;
    
    let mut files = Vec::new();
    for result in results {
        files.push(result?);
    }
    Ok(files)
}

// 删除文件记录
pub fn delete_project_file(file_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute("DELETE FROM project_files WHERE id = ?1", [file_id])?;
    Ok(())
}

// 根据ID获取文件信息
pub fn get_file_by_id(file_id: i32) -> Result<Option<ProjectFile>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let result = conn.query_row(
        "SELECT id, project_id, original_name, stored_name, file_path, file_size, file_type, version, created_at, updated_at
         FROM project_files WHERE id = ?1",
        [file_id],
        |row| {
            Ok(ProjectFile {
                id: row.get(0)?,
                project_id: row.get(1)?,
                original_name: row.get(2)?,
                stored_name: row.get(3)?,
                file_path: row.get(4)?,
                file_size: row.get(5)?,
                file_type: row.get(6)?,
                version: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }
    );
    
    match result {
        Ok(file) => Ok(Some(file)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// ==================== 项目活动管理相关 ====================

// 项目活动结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectActivity {
    pub id: i32,
    pub project_id: i32,
    pub name: String,
    pub description: Option<String>,
    pub estimated_completion_date: Option<String>,
    pub status: String,  // 待分配、未激活、进行中、已暂停、已完成
    pub activated_at: Option<String>,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// 带负责人信息的活动（用于展示）
#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityWithDetails {
    pub activity: ProjectActivity,
    pub assignees: Vec<Contact>,
}

// 插入新活动
pub fn insert_activity(
    project_id: i32,
    name: &str,
    description: Option<&str>,
    estimated_completion_date: Option<&str>,
) -> Result<i64> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO project_activities (project_id, name, description, estimated_completion_date, status) 
         VALUES (?1, ?2, ?3, ?4, '待分配')",
        rusqlite::params![project_id, name, description, estimated_completion_date],
    )?;
    
    Ok(conn.last_insert_rowid())
}

// 记录活动创建日志
pub fn log_activity_creation(
    activity_id: i64,
    activity_name: &str,
    project_id: i32,
    project_name: &str,
    assignee_names: &[String],
) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let now = chrono::Local::now();
    let mut desc = format!("{}，对项目「{}」新增活动「{}」", 
        now.format("%Y年%m月%d日 %H:%M"), project_name, activity_name);
    
    if !assignee_names.is_empty() {
        desc.push_str(&format!("，负责人：{}", assignee_names.join("、")));
    }
    
    conn.execute(
        "INSERT INTO operation_logs (operation_type, entity_type, entity_id, entity_name, project_id, project_name, description) 
         VALUES ('create', 'activity', ?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![activity_id, activity_name, project_id, project_name, desc],
    )?;
    
    Ok(())
}

// 记录活动状态变更日志
#[allow(dead_code)]
pub fn log_activity_status_change(
    activity_id: i32,
    activity_name: &str,
    project_name: &str,
    old_status: &str,
    new_status: &str,
    assignee_names: &[String],
) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let now = chrono::Local::now();
    let mut desc = format!("{}，项目「{}」的活动「{}」状态从「{}」变为「{}」", 
        now.format("%Y年%m月%d日 %H:%M"), project_name, activity_name, old_status, new_status);
    
    if !assignee_names.is_empty() {
        desc.push_str(&format!("，涉及：{}", assignee_names.join("、")));
    }
    
    conn.execute(
        "INSERT INTO operation_logs (operation_type, entity_type, entity_id, entity_name, description) 
         VALUES ('update', 'activity', ?1, ?2, ?3)",
        rusqlite::params![activity_id, activity_name, desc],
    )?;
    
    Ok(())
}

// 分配活动负责人
pub fn assign_contacts_to_activity(activity_id: i64, contact_ids: &[i32]) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    for contact_id in contact_ids {
        conn.execute(
            "INSERT OR IGNORE INTO activities_contacts (activity_id, contact_id) VALUES (?1, ?2)",
            rusqlite::params![activity_id, contact_id],
        )?;
    }
    
    // 如果有负责人，更新状态为"未激活"
    if !contact_ids.is_empty() {
        conn.execute(
            "UPDATE project_activities SET status = '未激活' WHERE id = ?1 AND status = '待分配'",
            [activity_id],
        )?;
    }
    
    Ok(())
}

// 移除活动负责人
pub fn unassign_contact_from_activity(activity_id: i32, contact_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "DELETE FROM activities_contacts WHERE activity_id = ?1 AND contact_id = ?2",
        rusqlite::params![activity_id, contact_id],
    )?;
    
    // 检查是否还有负责人
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM activities_contacts WHERE activity_id = ?1",
        [activity_id],
        |row| row.get(0)
    )?;
    
    // 如果没有负责人了且未激活，改回待分配
    if count == 0 {
        conn.execute(
            "UPDATE project_activities SET status = '待分配' WHERE id = ?1 AND status = '未激活'",
            [activity_id],
        )?;
    }
    
    Ok(())
}

// 激活活动
pub fn activate_activity(activity_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute(
        "UPDATE project_activities SET status = '进行中', activated_at = ?1 WHERE id = ?2 AND status IN ('未激活', '已暂停')",
        rusqlite::params![now, activity_id],
    )?;
    
    Ok(())
}

// 暂停活动
pub fn pause_activity(activity_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute(
        "UPDATE project_activities SET status = '已暂停', paused_at = ?1 WHERE id = ?2 AND status = '进行中'",
        rusqlite::params![now, activity_id],
    )?;
    
    Ok(())
}

// 完成活动
pub fn complete_activity(activity_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute(
        "UPDATE project_activities SET status = '已完成', completed_at = ?1 WHERE id = ?2",
        rusqlite::params![now, activity_id],
    )?;
    
    Ok(())
}

// 获取活动的负责人
pub fn fetch_assignees_for_activity(activity_id: i32) -> Result<Vec<Contact>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.title, c.notes, c.tags, c.phone, c.email, c.address, c.company, c.created_at, c.updated_at
         FROM contacts c
         INNER JOIN activities_contacts ac ON c.id = ac.contact_id
         WHERE ac.activity_id = ?1
         ORDER BY ac.assigned_at"
    )?;
    
    let results = stmt.query_map([activity_id], |row| {
        Ok(Contact {
            id: row.get(0)?,
            name: row.get(1)?,
            title: row.get(2)?,
            notes: row.get(3)?,
            tags: row.get(4)?,
            phone: row.get(5)?,
            email: row.get(6)?,
            address: row.get(7)?,
            company: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    
    let mut contacts = Vec::new();
    for result in results {
        contacts.push(result?);
    }
    Ok(contacts)
}

// 获取项目的所有活动
pub fn fetch_activities_for_project(project_id: i32) -> Result<Vec<ActivityWithDetails>> {
    let activities = {
        let db = get_db()?;
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, description, estimated_completion_date, status, activated_at, paused_at, completed_at, created_at, updated_at
             FROM project_activities
             WHERE project_id = ?1
             ORDER BY created_at DESC"
        )?;
        
        let activities: Vec<ProjectActivity> = stmt.query_map([project_id], |row| {
            Ok(ProjectActivity {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                estimated_completion_date: row.get(4)?,
                status: row.get(5)?,
                activated_at: row.get(6)?,
                paused_at: row.get(7)?,
                completed_at: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        activities
    };
    
    let mut results = Vec::new();
    for activity in activities {
        let assignees = fetch_assignees_for_activity(activity.id)?;
        results.push(ActivityWithDetails {
            activity,
            assignees,
        });
    }
    
    Ok(results)
}

// 更新活动信息
pub fn update_activity(
    activity_id: i32,
    name: &str,
    description: Option<&str>,
    estimated_completion_date: Option<&str>,
) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "UPDATE project_activities SET name = ?1, description = ?2, estimated_completion_date = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        rusqlite::params![name, description, estimated_completion_date, activity_id],
    )?;
    
    Ok(())
}

// 更新项目信息
pub fn update_project(project_id: i32, name: &str, description: Option<&str>) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "UPDATE projects SET name = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        rusqlite::params![name, description, project_id],
    )?;
    
    Ok(())
}

// 更新联系人信息
pub fn update_contact(
    contact_id: i32,
    name: &str,
    title: Option<&str>,
    notes: Option<&str>,
    tags: Option<&str>,
    phone: Option<&str>,
    email: Option<&str>,
    address: Option<&str>,
    company: Option<&str>,
) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "UPDATE contacts SET name = ?1, title = ?2, notes = ?3, tags = ?4, phone = ?5, email = ?6, address = ?7, company = ?8, updated_at = CURRENT_TIMESTAMP WHERE id = ?9",
        rusqlite::params![name, title, notes, tags, phone, email, address, company, contact_id],
    )?;
    
    Ok(())
}

// 更新事件信息
pub fn update_event(
    event_id: i32,
    title: &str,
    description: Option<&str>,
    event_date: &str,
    project_id: Option<i32>,
    event_type: Option<&str>,
    reminder_time: Option<&str>,
) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    // 如果提醒时间改变，重置 reminder_triggered
    conn.execute(
        "UPDATE events SET title = ?1, description = ?2, event_date = ?3, project_id = ?4, event_type = ?5, reminder_time = ?6, reminder_triggered = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?7",
        rusqlite::params![title, description, event_date, project_id, event_type, reminder_time, event_id],
    )?;
    
    Ok(())
}

// 更新事件关联的联系人（先删除旧关联，再添加新关联）
pub fn update_event_contacts(event_id: i32, contact_ids: &[i32]) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    // 删除旧关联
    conn.execute("DELETE FROM events_contacts WHERE event_id = ?1", [event_id])?;
    
    // 添加新关联
    for contact_id in contact_ids {
        conn.execute(
            "INSERT INTO events_contacts (event_id, contact_id) VALUES (?1, ?2)",
            rusqlite::params![event_id, contact_id],
        )?;
    }
    
    Ok(())
}

// 删除活动
pub fn delete_activity(activity_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute("DELETE FROM project_activities WHERE id = ?1", [activity_id])?;
    Ok(())
}

// 获取所有项目的所有活动（用于导出）
pub fn fetch_all_activities_with_project() -> Result<Vec<(ActivityWithDetails, String)>> {
    let (activities, project_names) = {
        let db = get_db()?;
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        // 获取项目名称映射
        let mut project_names: std::collections::HashMap<i32, String> = std::collections::HashMap::new();
        let mut p_stmt = conn.prepare("SELECT id, name FROM projects")?;
        let projects = p_stmt.query_map([], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
        })?;
        for p in projects {
            if let Ok((id, name)) = p {
                project_names.insert(id, name);
            }
        }
        
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, description, estimated_completion_date, status, activated_at, paused_at, completed_at, created_at, updated_at
             FROM project_activities
             ORDER BY project_id, created_at DESC"
        )?;
        
        let activities: Vec<ProjectActivity> = stmt.query_map([], |row| {
            Ok(ProjectActivity {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                estimated_completion_date: row.get(4)?,
                status: row.get(5)?,
                activated_at: row.get(6)?,
                paused_at: row.get(7)?,
                completed_at: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (activities, project_names)
    };
    
    let mut results = Vec::new();
    for activity in activities {
        let assignees = fetch_assignees_for_activity(activity.id)?;
        let project_name = project_names.get(&activity.project_id).cloned().unwrap_or_default();
        results.push((ActivityWithDetails {
            activity,
            assignees,
        }, project_name));
    }
    
    Ok(results)
}

// ==================== 事件提醒相关函数 ====================

// 获取待触发的提醒（当前时间前后1分钟内且未触发的）
pub fn fetch_pending_reminders() -> Result<Vec<EventWithDetails>> {
    let now = chrono::Local::now();
    let one_minute_ago = (now - chrono::Duration::minutes(1)).format("%Y-%m-%d %H:%M:%S").to_string();
    let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
    
    let (events, project_names) = {
        let db = get_db()?;
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        // 获取项目名称映射
        let mut project_names: std::collections::HashMap<i32, String> = std::collections::HashMap::new();
        let mut p_stmt = conn.prepare("SELECT id, name FROM projects")?;
        let projects = p_stmt.query_map([], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
        })?;
        for p in projects {
            if let Ok((id, name)) = p {
                project_names.insert(id, name);
            }
        }
        
        let mut stmt = conn.prepare(
            "SELECT e.id, e.title, e.description, e.event_date, e.project_id, e.event_type, e.reminder_time, e.reminder_triggered, e.created_at, e.updated_at
             FROM events e
             WHERE e.reminder_time IS NOT NULL 
             AND e.reminder_time <= ?1 
             AND e.reminder_time >= ?2
             AND (e.reminder_triggered = 0 OR e.reminder_triggered IS NULL)"
        )?;
        
        let events: Vec<Event> = stmt.query_map(rusqlite::params![now_str, one_minute_ago], |row| {
            Ok(Event {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                event_date: row.get(3)?,
                project_id: row.get(4)?,
                event_type: row.get(5)?,
                reminder_time: row.get(6)?,
                reminder_triggered: row.get::<_, i32>(7).unwrap_or(0) != 0,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        
        (events, project_names)
    };
    
    let mut results = Vec::new();
    for event in events {
        let contacts = fetch_contacts_for_event(event.id)?;
        let project_name = event.project_id.and_then(|pid| project_names.get(&pid).cloned());
        results.push(EventWithDetails {
            event,
            contacts,
            project_name,
        });
    }
    
    Ok(results)
}

// 标记提醒已触发
pub fn mark_reminder_triggered(event_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "UPDATE events SET reminder_triggered = 1 WHERE id = ?1",
        [event_id],
    )?;
    
    Ok(())
}

// 获取当天有提醒的事件ID列表（用于前端置顶显示）
pub fn fetch_today_reminder_event_ids() -> Result<Vec<i32>> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let today_start = format!("{} 00:00:00", today);
    let today_end = format!("{} 23:59:59", today);
    
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT id FROM events 
         WHERE reminder_time IS NOT NULL 
         AND reminder_time >= ?1 
         AND reminder_time <= ?2"
    )?;
    
    let ids: Vec<i32> = stmt.query_map(rusqlite::params![today_start, today_end], |row| {
        row.get(0)
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(ids)
}

// 更新事件提醒时间
pub fn update_event_reminder(event_id: i32, reminder_time: Option<&str>) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "UPDATE events SET reminder_time = ?1, reminder_triggered = 0 WHERE id = ?2",
        rusqlite::params![reminder_time, event_id],
    )?;
    
    Ok(())
}

// ==================== 操作日志相关 ====================

// 操作日志结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLog {
    pub id: i32,
    pub operation_type: String,  // create, update, delete
    pub entity_type: String,     // project, contact, event, activity
    pub entity_id: i32,
    pub entity_name: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub related_entities: Option<String>,
    pub project_id: Option<i32>,
    pub project_name: Option<String>,
    pub description: String,
    pub created_at: String,
}

// 插入操作日志
#[allow(dead_code)]
pub fn insert_operation_log(
    operation_type: &str,
    entity_type: &str,
    entity_id: i32,
    entity_name: &str,
    old_value: Option<&str>,
    new_value: Option<&str>,
    related_entities: Option<&str>,
    project_id: Option<i32>,
    project_name: Option<&str>,
    description: &str,
) -> Result<i64> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO operation_logs (operation_type, entity_type, entity_id, entity_name, old_value, new_value, related_entities, project_id, project_name, description) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![operation_type, entity_type, entity_id, entity_name, old_value, new_value, related_entities, project_id, project_name, description],
    )?;
    
    Ok(conn.last_insert_rowid())
}

// 获取时间范围内的操作日志
pub fn fetch_operation_logs(start_date: &str, end_date: &str) -> Result<Vec<OperationLog>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, operation_type, entity_type, entity_id, entity_name, old_value, new_value, related_entities, project_id, project_name, description, created_at
         FROM operation_logs
         WHERE created_at >= ?1 AND created_at <= ?2
         ORDER BY created_at ASC"
    )?;
    
    let logs: Vec<OperationLog> = stmt.query_map(rusqlite::params![start_date, end_date], |row| {
        Ok(OperationLog {
            id: row.get(0)?,
            operation_type: row.get(1)?,
            entity_type: row.get(2)?,
            entity_id: row.get(3)?,
            entity_name: row.get(4)?,
            old_value: row.get(5)?,
            new_value: row.get(6)?,
            related_entities: row.get(7)?,
            project_id: row.get(8)?,
            project_name: row.get(9)?,
            description: row.get(10)?,
            created_at: row.get(11)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(logs)
}

// ==================== 总结相关 ====================

// 总结结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Summary {
    pub id: i32,
    pub title: String,
    pub summary_type: String,  // daily, weekly, monthly, yearly, custom
    pub start_date: String,
    pub end_date: String,
    pub content: String,
    pub statistics: Option<String>,
    pub is_auto_generated: bool,
    pub created_at: String,
}

// 生成总结
pub fn generate_summary(
    summary_type: &str,
    start_date: &str,
    end_date: &str,
    is_auto: bool,
) -> Result<Summary> {
    // 获取时间范围内的操作日志
    let start_datetime = format!("{} 00:00:00", start_date);
    let end_datetime = format!("{} 23:59:59", end_date);
    let logs = fetch_operation_logs(&start_datetime, &end_datetime)?;
    
    // 生成标题
    let now = chrono::Local::now();
    let title = format!("{}生成 - {} 至 {} 总结", 
        now.format("%Y年%m月%d日 %H:%M"),
        start_date,
        end_date
    );
    
    // 生成内容
    let mut content = String::new();
    content.push_str(&format!("# {} 至 {} 工作总结\n\n", start_date, end_date));
    content.push_str(&format!("生成时间：{}\n\n", now.format("%Y年%m月%d日 %H:%M:%S")));
    content.push_str("---\n\n");
    
    if logs.is_empty() {
        content.push_str("该时间段内没有操作记录。\n");
    } else {
        content.push_str("## 操作记录\n\n");
        for log in &logs {
            content.push_str(&format!("- {}\n", log.description));
        }
    }
    
    // 统计数据
    let mut project_count = 0;
    let mut contact_count = 0;
    let mut event_count = 0;
    let mut activity_count = 0;
    
    for log in &logs {
        if log.operation_type == "create" {
            match log.entity_type.as_str() {
                "project" => project_count += 1,
                "contact" => contact_count += 1,
                "event" => event_count += 1,
                "activity" => activity_count += 1,
                _ => {}
            }
        }
    }
    
    let statistics = serde_json::json!({
        "total_operations": logs.len(),
        "new_projects": project_count,
        "new_contacts": contact_count,
        "new_events": event_count,
        "new_activities": activity_count
    }).to_string();
    
    content.push_str("\n## 统计数据\n\n");
    content.push_str(&format!("- 总操作数：{}\n", logs.len()));
    content.push_str(&format!("- 新增项目：{}\n", project_count));
    content.push_str(&format!("- 新增联系人：{}\n", contact_count));
    content.push_str(&format!("- 新增事件：{}\n", event_count));
    content.push_str(&format!("- 新增活动：{}\n", activity_count));
    
    // 插入数据库
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute(
        "INSERT INTO summaries (title, summary_type, start_date, end_date, content, statistics, is_auto_generated) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![title, summary_type, start_date, end_date, content, statistics, if is_auto { 1 } else { 0 }],
    )?;
    
    let id = conn.last_insert_rowid() as i32;
    let created_at = now.format("%Y-%m-%d %H:%M:%S").to_string();
    
    Ok(Summary {
        id,
        title,
        summary_type: summary_type.to_string(),
        start_date: start_date.to_string(),
        end_date: end_date.to_string(),
        content,
        statistics: Some(statistics),
        is_auto_generated: is_auto,
        created_at,
    })
}

// 获取所有总结列表
pub fn fetch_summaries() -> Result<Vec<Summary>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, title, summary_type, start_date, end_date, content, statistics, is_auto_generated, created_at
         FROM summaries
         ORDER BY created_at DESC"
    )?;
    
    let summaries: Vec<Summary> = stmt.query_map([], |row| {
        Ok(Summary {
            id: row.get(0)?,
            title: row.get(1)?,
            summary_type: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            content: row.get(5)?,
            statistics: row.get(6)?,
            is_auto_generated: row.get::<_, i32>(7).unwrap_or(0) != 0,
            created_at: row.get(8)?,
        })
    })?.filter_map(|r| r.ok()).collect();
    
    Ok(summaries)
}

// 获取单个总结详情
pub fn fetch_summary_by_id(summary_id: i32) -> Result<Option<Summary>> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    let result = conn.query_row(
        "SELECT id, title, summary_type, start_date, end_date, content, statistics, is_auto_generated, created_at
         FROM summaries WHERE id = ?1",
        [summary_id],
        |row| {
            Ok(Summary {
                id: row.get(0)?,
                title: row.get(1)?,
                summary_type: row.get(2)?,
                start_date: row.get(3)?,
                end_date: row.get(4)?,
                content: row.get(5)?,
                statistics: row.get(6)?,
                is_auto_generated: row.get::<_, i32>(7).unwrap_or(0) != 0,
                created_at: row.get(8)?,
            })
        }
    );
    
    match result {
        Ok(summary) => Ok(Some(summary)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

// 删除总结
pub fn delete_summary(summary_id: i32) -> Result<()> {
    let db = get_db()?;
    let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(1),
        Some(format!("锁失败: {}", e))
    ))?;
    
    conn.execute("DELETE FROM summaries WHERE id = ?1", [summary_id])?;
    Ok(())
}

// 检查是否需要自动生成总结
pub fn check_and_generate_auto_summaries() -> Result<Vec<Summary>> {
    let today = chrono::Local::now();
    let mut generated = Vec::new();
    
    // 检查是否需要生成日总结（前一天）
    let yesterday = today - chrono::Duration::days(1);
    let yesterday_str = yesterday.format("%Y-%m-%d").to_string();
    
    // 检查昨天是否已有日总结
    let db = get_db()?;
    {
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM summaries WHERE summary_type = 'daily' AND start_date = ?1",
            [&yesterday_str],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if count == 0 {
            drop(conn); // 释放锁
            if let Ok(summary) = generate_summary("daily", &yesterday_str, &yesterday_str, true) {
                generated.push(summary);
            }
        }
    }
    
    // 检查是否需要生成周总结（每周一生成上周总结）
    if today.weekday() == chrono::Weekday::Mon {
        let last_week_end = today - chrono::Duration::days(1);
        let last_week_start = today - chrono::Duration::days(7);
        let start_str = last_week_start.format("%Y-%m-%d").to_string();
        let end_str = last_week_end.format("%Y-%m-%d").to_string();
        
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM summaries WHERE summary_type = 'weekly' AND start_date = ?1",
            [&start_str],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if count == 0 {
            drop(conn);
            if let Ok(summary) = generate_summary("weekly", &start_str, &end_str, true) {
                generated.push(summary);
            }
        }
    }
    
    // 检查是否需要生成月总结（每月1日生成上月总结）
    if today.day() == 1 {
        let last_month = today - chrono::Duration::days(1);
        let start_str = format!("{}-{:02}-01", last_month.year(), last_month.month());
        let end_str = last_month.format("%Y-%m-%d").to_string();
        
        let conn = db.lock().map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(1),
            Some(format!("锁失败: {}", e))
        ))?;
        
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM summaries WHERE summary_type = 'monthly' AND start_date = ?1",
            [&start_str],
            |row| row.get(0)
        ).unwrap_or(0);
        
        if count == 0 {
            drop(conn);
            if let Ok(summary) = generate_summary("monthly", &start_str, &end_str, true) {
                generated.push(summary);
            }
        }
    }
    
    Ok(generated)
}