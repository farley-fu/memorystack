// src-tauri/src/main.rs
mod db;

use std::path::PathBuf;
use std::fs;
use std::time::Duration;
use chrono::Local;

#[tauri::command]
fn create_project(name: String, description: Option<String>) -> Result<(), String> {
    println!("🔄 正在创建项目: {}", name);
    let _ = db::insert_project(&name, description.as_deref())
        .map_err(|e| e.to_string())?;
    println!("✅ 项目创建成功: {}", name);
    Ok(())
}

#[tauri::command]
fn get_projects() -> Result<Vec<db::Project>, String> {
    println!("🔄 正在获取项目列表...");
    let projects = db::fetch_projects().map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个项目", projects.len());
    Ok(projects)
}

// 更新项目
#[tauri::command]
fn update_project(project_id: i32, name: String, description: Option<String>) -> Result<(), String> {
    println!("🔄 正在更新项目 {}...", project_id);
    db::update_project(project_id, &name, description.as_deref())
        .map_err(|e| e.to_string())?;
    println!("✅ 项目更新成功");
    Ok(())
}

// 创建联系人
#[tauri::command]
fn create_contact(
    name: String,
    title: Option<String>,
    notes: Option<String>,
    tags: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    company: Option<String>,
) -> Result<(), String> {
    println!("🔄 正在创建联系人: {}", name);
    let _ = db::insert_contact(
        &name,
        title.as_deref(),
        notes.as_deref(),
        tags.as_deref(),
        phone.as_deref(),
        email.as_deref(),
        address.as_deref(),
        company.as_deref(),
    ).map_err(|e| e.to_string())?;
    println!("✅ 联系人创建成功: {}", name);
    Ok(())
}

// 获取所有联系人
#[tauri::command]
fn get_contacts() -> Result<Vec<db::Contact>, String> {
    println!("🔄 正在获取联系人列表...");
    let contacts = db::fetch_contacts().map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个联系人", contacts.len());
    Ok(contacts)
}

// 更新联系人
#[tauri::command]
fn update_contact(
    contact_id: i32,
    name: String,
    title: Option<String>,
    notes: Option<String>,
    tags: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    company: Option<String>,
) -> Result<(), String> {
    println!("🔄 正在更新联系人 {}...", contact_id);
    db::update_contact(
        contact_id,
        &name,
        title.as_deref(),
        notes.as_deref(),
        tags.as_deref(),
        phone.as_deref(),
        email.as_deref(),
        address.as_deref(),
        company.as_deref(),
    ).map_err(|e| e.to_string())?;
    println!("✅ 联系人更新成功");
    Ok(())
}

// 关联联系人与项目
#[tauri::command]
fn link_contact_project(
    project_id: i32,
    contact_id: i32,
    role: Option<String>,
    notes: Option<String>,
) -> Result<(), String> {
    println!("🔄 正在将联系人 {} 关联到项目 {}", contact_id, project_id);
    db::link_contact_to_project(project_id, contact_id, role.as_deref(), notes.as_deref())
        .map_err(|e| e.to_string())?;
    println!("✅ 关联成功");
    Ok(())
}

#[tauri::command]
fn get_project_contacts(project_id: i32) -> Result<Vec<(db::Contact, Option<String>, Option<String>)>, String> {
    println!("🔄 正在获取项目 {} 的联系人列表...", project_id);
    let contacts = db::fetch_contacts_for_project(project_id).map_err(|e| e.to_string())?;
    
    // 添加调试日志
    println!("✅ 获取到 {} 个关联联系人", contacts.len());
    for (i, (contact, role, notes)) in contacts.iter().enumerate() {
        println!("  联系人 {}: ID={}, 姓名={}, 角色={:?}, 备注={:?}", 
                 i+1, contact.id, contact.name, role, notes);
    }
    
    Ok(contacts)
}

// 取消联系人与项目的关联
#[tauri::command]
fn unlink_contact_project(project_id: i32, contact_id: i32) -> Result<(), String> {
    println!("🔄 正在取消联系人 {} 与项目 {} 的关联", contact_id, project_id);
    db::unlink_contact_from_project(project_id, contact_id)
        .map_err(|e| e.to_string())?;
    println!("✅ 取消关联成功");
    Ok(())
}

// ==================== 事件相关命令 ====================

// 创建事件并关联联系人
#[tauri::command]
fn create_event(
    title: String,
    description: Option<String>,
    event_date: String,
    project_id: Option<i32>,
    event_type: Option<String>,
    contact_ids: Vec<i32>,
    reminder_time: Option<String>,
) -> Result<(), String> {
    println!("🔄 正在创建事件: {}", title);
    
    if contact_ids.is_empty() {
        return Err("事件必须关联至少一个联系人".to_string());
    }
    
    let event_id = db::insert_event(
        &title,
        description.as_deref(),
        &event_date,
        project_id,
        event_type.as_deref(),
        reminder_time.as_deref(),
    ).map_err(|e| e.to_string())?;
    
    db::link_contacts_to_event(event_id, &contact_ids)
        .map_err(|e| e.to_string())?;
    
    // 获取项目名称（如果有）
    let project_name = if let Some(pid) = project_id {
        db::get_project_name(pid).ok()
    } else {
        None
    };
    
    // 获取联系人名称
    let contacts = db::fetch_contacts().map_err(|e| e.to_string())?;
    let contact_names: Vec<String> = contacts.iter()
        .filter(|c| contact_ids.contains(&c.id))
        .map(|c| c.name.clone())
        .collect();
    
    // 记录操作日志
    let _ = db::log_event_creation(
        event_id,
        &title,
        event_type.as_deref(),
        project_id,
        project_name.as_deref(),
        &contact_names,
    );
    
    // 如果事件关联了项目，自动将联系人绑定到项目（跳过已存在的）
    if let Some(pid) = project_id {
        for contact_id in &contact_ids {
            // 使用 INSERT OR REPLACE，已存在的联系人会被静默跳过
            let _ = db::link_contact_to_project(pid, *contact_id, None, None);
        }
        println!("✅ 已自动将 {} 个联系人绑定到项目 {}", contact_ids.len(), pid);
    }
    
    println!("✅ 事件创建成功: {}, 关联 {} 个联系人", title, contact_ids.len());
    Ok(())
}

// 获取联系人时间线
#[tauri::command]
fn get_contact_timeline(contact_id: i32) -> Result<Vec<db::EventWithDetails>, String> {
    println!("🔄 正在获取联系人 {} 的时间线...", contact_id);
    let events = db::fetch_events_for_contact(contact_id).map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个事件", events.len());
    Ok(events)
}

// 获取项目时间线
#[tauri::command]
fn get_project_timeline(project_id: i32) -> Result<Vec<db::EventWithDetails>, String> {
    println!("🔄 正在获取项目 {} 的时间线...", project_id);
    let events = db::fetch_events_for_project(project_id).map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个事件", events.len());
    Ok(events)
}

// 获取所有事件
#[tauri::command]
fn get_all_events() -> Result<Vec<db::EventWithDetails>, String> {
    println!("🔄 正在获取所有事件...");
    let events = db::fetch_all_events().map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个事件", events.len());
    Ok(events)
}

// 删除事件
#[tauri::command]
fn delete_event(event_id: i32) -> Result<(), String> {
    println!("🔄 正在删除事件 {}...", event_id);
    db::delete_event(event_id).map_err(|e| e.to_string())?;
    println!("✅ 事件删除成功");
    Ok(())
}

// 更新事件
#[tauri::command]
fn update_event(
    event_id: i32,
    title: String,
    description: Option<String>,
    event_date: String,
    project_id: Option<i32>,
    event_type: Option<String>,
    reminder_time: Option<String>,
    contact_ids: Vec<i32>,
) -> Result<(), String> {
    println!("🔄 正在更新事件 {}...", event_id);
    
    // 更新事件基本信息
    db::update_event(
        event_id,
        &title,
        description.as_deref(),
        &event_date,
        project_id,
        event_type.as_deref(),
        reminder_time.as_deref(),
    ).map_err(|e| e.to_string())?;
    
    // 更新关联的联系人
    db::update_event_contacts(event_id, &contact_ids)
        .map_err(|e| e.to_string())?;
    
    println!("✅ 事件更新成功");
    Ok(())
}

// ==================== 项目文件管理相关命令 ====================

// 获取项目文件存储的根目录
fn get_files_root_dir() -> Result<PathBuf, String> {
    let app_data_dir = dirs::data_local_dir()
        .ok_or("无法获取应用数据目录")?;
    let files_dir = app_data_dir.join("mindmirror").join("project_files");
    Ok(files_dir)
}

// 清理文件夹名称，移除不允许的字符
fn sanitize_folder_name(name: &str) -> String {
    // 替换文件系统不允许的字符
    let sanitized: String = name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c
        })
        .collect();
    
    // 移除首尾空格和点
    let trimmed = sanitized.trim().trim_matches('.');
    
    // 如果结果为空，使用默认名称
    if trimmed.is_empty() {
        "unnamed_project".to_string()
    } else {
        trimmed.to_string()
    }
}

// 获取项目的文件夹路径（使用项目名称作为文件夹名）
fn get_project_folder(project_id: i32) -> Result<PathBuf, String> {
    let root = get_files_root_dir()?;
    
    // 获取项目名称
    let project_name = db::get_project_name(project_id)
        .map_err(|e| format!("获取项目名称失败: {}", e))?;
    
    // 清理项目名称作为文件夹名
    let folder_name = sanitize_folder_name(&project_name);
    
    // 添加项目ID后缀以确保唯一性（避免重名项目冲突）
    let unique_folder_name = format!("{}_{}", folder_name, project_id);
    
    Ok(root.join(unique_folder_name))
}

// 上传文件到项目
#[tauri::command]
fn upload_file_to_project(
    project_id: i32,
    source_path: String,
    contact_id: Option<i32>,
) -> Result<db::ProjectFile, String> {
    println!("🔄 正在上传文件到项目 {}: {}", project_id, source_path);
    
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("源文件不存在: {}", source_path));
    }
    
    // 获取原始文件名
    let original_name = source.file_name()
        .and_then(|n| n.to_str())
        .ok_or("无法获取文件名")?
        .to_string();
    
    // 获取文件扩展名
    let extension = source.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_string());
    
    // 获取文件大小
    let metadata = fs::metadata(&source).map_err(|e| e.to_string())?;
    let file_size = metadata.len() as i64;
    
    // 获取或创建项目文件夹
    let project_folder = get_project_folder(project_id)?;
    fs::create_dir_all(&project_folder).map_err(|e| format!("创建项目文件夹失败: {}", e))?;
    
    // 检查是否存在同名文件，获取版本号
    let current_version = db::get_latest_file_version(project_id, &original_name)
        .map_err(|e| e.to_string())?;
    let new_version = current_version + 1;
    
    // 生成存储文件名（如果是新版本，添加时间戳）
    let stored_name = if new_version > 1 {
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        if let Some(ref ext) = extension {
            let name_without_ext = original_name.strip_suffix(&format!(".{}", ext)).unwrap_or(&original_name);
            format!("{}_{}.{}", name_without_ext, timestamp, ext)
        } else {
            format!("{}_{}", original_name, timestamp)
        }
    } else {
        original_name.clone()
    };
    
    // 复制文件到项目文件夹
    let dest_path = project_folder.join(&stored_name);
    fs::copy(&source, &dest_path).map_err(|e| format!("复制文件失败: {}", e))?;
    
    let dest_path_str = dest_path.to_string_lossy().to_string();
    
    // 插入数据库记录
    let file_id = db::insert_project_file(
        project_id,
        &original_name,
        &stored_name,
        &dest_path_str,
        Some(file_size),
        extension.as_deref(),
        new_version,
    ).map_err(|e| e.to_string())?;
    
    // 自动创建事件
    let event_title = if new_version > 1 {
        format!("更新文件: {}", original_name)
    } else {
        format!("新增文件: {}", original_name)
    };
    
    let today = Local::now().format("%Y-%m-%d").to_string();
    
    // 如果提供了联系人ID，创建事件
    if let Some(cid) = contact_id {
        let _ = db::insert_event(
            &event_title,
            Some(&format!("文件版本: v{}", new_version)),
            &today,
            Some(project_id),
            Some("文件"),
            None,  // 文件上传事件不设置提醒
        ).and_then(|event_id| {
            db::link_contacts_to_event(event_id, &[cid])
        });
    }
    
    // 获取并返回文件信息
    let file = db::get_file_by_id(file_id as i32)
        .map_err(|e| e.to_string())?
        .ok_or("文件创建后无法找到")?;
    
    println!("✅ 文件上传成功: {} (版本 {})", original_name, new_version);
    Ok(file)
}

// 获取项目的所有文件
#[tauri::command]
fn get_project_files(project_id: i32) -> Result<Vec<db::ProjectFile>, String> {
    println!("🔄 正在获取项目 {} 的文件列表...", project_id);
    let files = db::fetch_files_for_project(project_id).map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个文件", files.len());
    Ok(files)
}

// 打开文件
#[tauri::command]
fn open_file(file_path: String) -> Result<(), String> {
    println!("🔄 正在打开文件: {}", file_path);
    
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &file_path])
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败: {}", e))?;
    }
    
    println!("✅ 文件已打开");
    Ok(())
}

// 在文件管理器中显示文件
#[tauri::command]
fn show_in_folder(file_path: String) -> Result<(), String> {
    println!("🔄 正在打开文件所在目录: {}", file_path);
    
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &file_path])
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &file_path])
            .spawn()
            .map_err(|e| format!("打开目录失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = path.parent() {
            std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("打开目录失败: {}", e))?;
        }
    }
    
    println!("✅ 已在文件管理器中显示");
    Ok(())
}

// 全局搜索文件
#[tauri::command]
fn search_files(keyword: String) -> Result<Vec<db::ProjectFileWithProject>, String> {
    println!("🔄 正在搜索文件: {}", keyword);
    let files = db::search_files_global(&keyword).map_err(|e| e.to_string())?;
    println!("✅ 找到 {} 个匹配文件", files.len());
    Ok(files)
}

// 删除项目文件
#[tauri::command]
fn delete_project_file(file_id: i32) -> Result<(), String> {
    println!("🔄 正在删除文件 {}...", file_id);
    
    // 先获取文件信息
    let file = db::get_file_by_id(file_id)
        .map_err(|e| e.to_string())?
        .ok_or("文件不存在")?;
    
    // 删除物理文件
    let path = PathBuf::from(&file.file_path);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("删除文件失败: {}", e))?;
    }
    
    // 删除数据库记录
    db::delete_project_file(file_id).map_err(|e| e.to_string())?;
    
    println!("✅ 文件删除成功");
    Ok(())
}

// ==================== 项目活动管理相关命令 ====================

// 创建活动
#[tauri::command]
fn create_activity(
    project_id: i32,
    name: String,
    description: Option<String>,
    estimated_completion_date: Option<String>,
    contact_ids: Vec<i32>,
) -> Result<(), String> {
    println!("🔄 正在创建活动: {}", name);
    
    let activity_id = db::insert_activity(
        project_id,
        &name,
        description.as_deref(),
        estimated_completion_date.as_deref(),
    ).map_err(|e| e.to_string())?;
    
    if !contact_ids.is_empty() {
        db::assign_contacts_to_activity(activity_id, &contact_ids)
            .map_err(|e| e.to_string())?;
    }
    
    // 获取项目名称和负责人名称用于日志
    let project_name = db::get_project_name(project_id).unwrap_or_default();
    let contacts = db::fetch_contacts().map_err(|e| e.to_string())?;
    let assignee_names: Vec<String> = contacts.iter()
        .filter(|c| contact_ids.contains(&c.id))
        .map(|c| c.name.clone())
        .collect();
    
    // 记录操作日志
    let _ = db::log_activity_creation(
        activity_id,
        &name,
        project_id,
        &project_name,
        &assignee_names,
    );
    
    println!("✅ 活动创建成功: {}", name);
    Ok(())
}

// 获取项目的所有活动
#[tauri::command]
fn get_project_activities(project_id: i32) -> Result<Vec<db::ActivityWithDetails>, String> {
    println!("🔄 正在获取项目 {} 的活动列表...", project_id);
    let activities = db::fetch_activities_for_project(project_id).map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个活动", activities.len());
    Ok(activities)
}

// 更新活动信息
#[tauri::command]
fn update_activity(
    activity_id: i32,
    name: String,
    description: Option<String>,
    estimated_completion_date: Option<String>,
) -> Result<(), String> {
    println!("🔄 正在更新活动 {}...", activity_id);
    db::update_activity(
        activity_id,
        &name,
        description.as_deref(),
        estimated_completion_date.as_deref(),
    ).map_err(|e| e.to_string())?;
    println!("✅ 活动更新成功");
    Ok(())
}

// 分配活动负责人
#[tauri::command]
fn assign_activity_contacts(
    activity_id: i32,
    contact_ids: Vec<i32>,
) -> Result<(), String> {
    println!("🔄 正在为活动 {} 分配负责人...", activity_id);
    db::assign_contacts_to_activity(activity_id as i64, &contact_ids)
        .map_err(|e| e.to_string())?;
    println!("✅ 负责人分配成功");
    Ok(())
}

// 移除活动负责人
#[tauri::command]
fn unassign_activity_contact(
    activity_id: i32,
    contact_id: i32,
) -> Result<(), String> {
    println!("🔄 正在移除活动 {} 的负责人 {}...", activity_id, contact_id);
    db::unassign_contact_from_activity(activity_id, contact_id)
        .map_err(|e| e.to_string())?;
    println!("✅ 负责人移除成功");
    Ok(())
}

// 激活活动
#[tauri::command]
fn activate_activity(activity_id: i32) -> Result<(), String> {
    println!("🔄 正在激活活动 {}...", activity_id);
    db::activate_activity(activity_id).map_err(|e| e.to_string())?;
    println!("✅ 活动已激活");
    Ok(())
}

// 暂停活动
#[tauri::command]
fn pause_activity(activity_id: i32) -> Result<(), String> {
    println!("🔄 正在暂停活动 {}...", activity_id);
    db::pause_activity(activity_id).map_err(|e| e.to_string())?;
    println!("✅ 活动已暂停");
    Ok(())
}

// 完成活动
#[tauri::command]
fn complete_activity(activity_id: i32) -> Result<(), String> {
    println!("🔄 正在完成活动 {}...", activity_id);
    db::complete_activity(activity_id).map_err(|e| e.to_string())?;
    println!("✅ 活动已完成");
    Ok(())
}

// 删除活动
#[tauri::command]
fn delete_activity(activity_id: i32) -> Result<(), String> {
    println!("🔄 正在删除活动 {}...", activity_id);
    db::delete_activity(activity_id).map_err(|e| e.to_string())?;
    println!("✅ 活动删除成功");
    Ok(())
}

// 导出所有活动为JSON（前端会转换为Excel）
#[tauri::command]
fn export_activities() -> Result<Vec<(db::ActivityWithDetails, String)>, String> {
    println!("🔄 正在导出所有活动...");
    let activities = db::fetch_all_activities_with_project().map_err(|e| e.to_string())?;
    println!("✅ 导出 {} 个活动", activities.len());
    Ok(activities)
}

// ==================== 事件提醒相关命令 ====================

// 更新事件提醒时间
#[tauri::command]
fn update_event_reminder(event_id: i32, reminder_time: Option<String>) -> Result<(), String> {
    println!("🔄 正在更新事件 {} 的提醒时间...", event_id);
    db::update_event_reminder(event_id, reminder_time.as_deref())
        .map_err(|e| e.to_string())?;
    println!("✅ 提醒时间更新成功");
    Ok(())
}

// 获取当天有提醒的事件ID列表
#[tauri::command]
fn get_today_reminder_events() -> Result<Vec<i32>, String> {
    println!("🔄 正在获取当天有提醒的事件...");
    let ids = db::fetch_today_reminder_event_ids().map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个有提醒的事件", ids.len());
    Ok(ids)
}

// ==================== 总结相关命令 ====================

// 手动生成总结
#[tauri::command]
fn generate_summary(
    summary_type: String,
    start_date: String,
    end_date: String,
) -> Result<db::Summary, String> {
    println!("🔄 正在生成 {} 总结 ({} - {})...", summary_type, start_date, end_date);
    let summary = db::generate_summary(&summary_type, &start_date, &end_date, false)
        .map_err(|e| e.to_string())?;
    println!("✅ 总结生成成功");
    Ok(summary)
}

// 获取所有总结列表
#[tauri::command]
fn get_summaries() -> Result<Vec<db::Summary>, String> {
    println!("🔄 正在获取总结列表...");
    let summaries = db::fetch_summaries().map_err(|e| e.to_string())?;
    println!("✅ 获取到 {} 个总结", summaries.len());
    Ok(summaries)
}

// 获取总结详情
#[tauri::command]
fn get_summary_detail(summary_id: i32) -> Result<Option<db::Summary>, String> {
    println!("🔄 正在获取总结 {} 详情...", summary_id);
    let summary = db::fetch_summary_by_id(summary_id).map_err(|e| e.to_string())?;
    Ok(summary)
}

// 删除总结
#[tauri::command]
fn delete_summary(summary_id: i32) -> Result<(), String> {
    println!("🔄 正在删除总结 {}...", summary_id);
    db::delete_summary(summary_id).map_err(|e| e.to_string())?;
    println!("✅ 总结删除成功");
    Ok(())
}

// 后台提醒检查任务
async fn reminder_check_task(app_handle: tauri::AppHandle) {
    use tauri_plugin_notification::NotificationExt;
    
    println!("🔔 提醒检查任务已启动");
    
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    
    loop {
        interval.tick().await;
        
        // 检查待触发的提醒
        if let Ok(pending_reminders) = db::fetch_pending_reminders() {
            for event_detail in pending_reminders {
                let event = &event_detail.event;
                
                // 发送系统通知
                let title = format!("事件提醒: {}", event.title);
                let mut body = String::new();
                
                if let Some(ref pname) = event_detail.project_name {
                    body.push_str(&format!("项目: {}\n", pname));
                }
                
                if !event_detail.contacts.is_empty() {
                    let names: Vec<&str> = event_detail.contacts.iter().map(|c| c.name.as_str()).collect();
                    body.push_str(&format!("相关人员: {}", names.join("、")));
                }
                
                // 发送通知
                if let Err(e) = app_handle.notification()
                    .builder()
                    .title(&title)
                    .body(&body)
                    .show() {
                    println!("⚠️ 发送通知失败: {}", e);
                } else {
                    println!("🔔 已发送提醒: {}", event.title);
                }
                
                // 标记提醒已触发
                let _ = db::mark_reminder_triggered(event.id);
            }
        }
        
        // 检查并生成自动总结（每天凌晨检查一次）
        let now = Local::now();
        if now.format("%H:%M").to_string() == "00:10" {
            if let Ok(generated) = db::check_and_generate_auto_summaries() {
                for summary in generated {
                    println!("📊 自动生成总结: {}", summary.title);
                }
            }
        }
    }
}

fn main() {
    // 预初始化数据库（这会触发首次连接）
    let _ = db::get_db().expect("数据库初始化失败");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // 启动后台提醒检查任务
            tauri::async_runtime::spawn(async move {
                reminder_check_task(app_handle).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project, 
            get_projects,
            update_project,
            create_contact,
            get_contacts,
            update_contact,
            link_contact_project,
            get_project_contacts,
            unlink_contact_project,
            create_event,
            get_contact_timeline,
            get_project_timeline,
            get_all_events,
            delete_event,
            update_event,
            upload_file_to_project,
            get_project_files,
            open_file,
            show_in_folder,
            search_files,
            delete_project_file,
            create_activity,
            get_project_activities,
            update_activity,
            assign_activity_contacts,
            unassign_activity_contact,
            activate_activity,
            pause_activity,
            complete_activity,
            delete_activity,
            export_activities,
            update_event_reminder,
            get_today_reminder_events,
            generate_summary,
            get_summaries,
            get_summary_detail,
            delete_summary
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}