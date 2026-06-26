use crate::common::{read_settings, write_settings};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

static NONCE_COUNTER: AtomicU64 = AtomicU64::new(0);
static CHAT_HISTORY_SESSION_KEY: OnceLock<Mutex<Option<[u8; 32]>>> = OnceLock::new();

const PBKDF2_ITERATIONS: u32 = 120_000;
const PASSWORD_VERIFIER_LABEL: &[u8] = b"assistia-chat-history-verifier-v1";
const ENCRYPTION_TAG_LABEL: &[u8] = b"assistia-chat-history-file-tag-v1";

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatHistoryMessage {
    pub id: u64,
    pub role: String,
    pub content: String,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConversation {
    pub id: String,
    pub title: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub selected_model: String,
    pub messages: Vec<ChatHistoryMessage>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConversationSummary {
    pub id: String,
    pub title: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub message_count: usize,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatHistorySecurityState {
    pub is_encrypted: bool,
    pub is_unlocked: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConversationFile {
    version: u8,
    #[serde(default)]
    encrypted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    conversation: Option<ChatConversation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    nonce: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tag: Option<String>,
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn chat_history_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("chat-history"))
        .map_err(|error| error.to_string())
}

fn validate_conversation_id(id: &str) -> Result<(), String> {
    let is_valid = !id.is_empty()
        && id.len() <= 96
        && id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'));

    if is_valid {
        Ok(())
    } else {
        Err("Identifiant de conversation invalide.".to_string())
    }
}

fn conversation_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    validate_conversation_id(id)?;

    Ok(chat_history_dir(app)?.join(format!("{id}.assistia-chat")))
}

fn splitmix64(seed: &mut u64) -> u64 {
    *seed = seed.wrapping_add(0x9E37_79B9_7F4A_7C15);

    let mut value = *seed;
    value = (value ^ (value >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    value = (value ^ (value >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);

    value ^ (value >> 31)
}

fn random_bytes<const SIZE: usize>() -> [u8; SIZE] {
    let mut bytes = [0_u8; SIZE];

    if let Ok(mut random_file) = fs::File::open("/dev/urandom") {
        if random_file.read_exact(&mut bytes).is_ok() {
            return bytes;
        }
    }

    let seed_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos() as u64)
        .unwrap_or(0);
    let counter = NONCE_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut seed = seed_time ^ counter.rotate_left(17) ^ ((std::process::id() as u64) << 32);

    for chunk in bytes.chunks_mut(8) {
        let value = splitmix64(&mut seed).to_le_bytes();
        chunk.copy_from_slice(&value[..chunk.len()]);
    }

    bytes
}

fn nonce() -> [u8; 12] {
    random_bytes::<12>()
}

fn session_key_store() -> &'static Mutex<Option<[u8; 32]>> {
    CHAT_HISTORY_SESSION_KEY.get_or_init(|| Mutex::new(None))
}

fn current_session_key() -> Result<Option<[u8; 32]>, String> {
    let guard = session_key_store()
        .lock()
        .map_err(|_| "Impossible d'acceder a la cle de session du chat.".to_string())?;

    Ok(*guard)
}

fn set_session_key(key: Option<[u8; 32]>) -> Result<(), String> {
    let mut guard = session_key_store()
        .lock()
        .map_err(|_| "Impossible de memoriser la cle de session du chat.".to_string())?;

    *guard = key;

    Ok(())
}

pub fn clear_chat_history_session_key() {
    let _ = set_session_key(None);
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> [u8; 32] {
    let mut normalized_key = [0_u8; 64];

    if key.len() > 64 {
        let digest = Sha256::digest(key);
        normalized_key[..32].copy_from_slice(&digest);
    } else {
        normalized_key[..key.len()].copy_from_slice(key);
    }

    let mut inner_pad = [0x36_u8; 64];
    let mut outer_pad = [0x5c_u8; 64];

    for index in 0..64 {
        inner_pad[index] ^= normalized_key[index];
        outer_pad[index] ^= normalized_key[index];
    }

    let mut inner = Sha256::new();
    inner.update(inner_pad);
    inner.update(data);
    let inner_hash = inner.finalize();

    let mut outer = Sha256::new();
    outer.update(outer_pad);
    outer.update(inner_hash);
    let digest = outer.finalize();

    let mut output = [0_u8; 32];
    output.copy_from_slice(&digest);

    output
}

fn pbkdf2_sha256(password: &[u8], salt: &[u8], iterations: u32, output_length: usize) -> Vec<u8> {
    let mut output = Vec::with_capacity(output_length);
    let block_count = (output_length + 31) / 32;

    for block_index in 1..=block_count {
        let mut salt_block = Vec::with_capacity(salt.len() + 4);
        salt_block.extend_from_slice(salt);
        salt_block.extend_from_slice(&(block_index as u32).to_be_bytes());

        let mut previous = hmac_sha256(password, &salt_block);
        let mut block = previous;

        for _ in 1..iterations {
            previous = hmac_sha256(password, &previous);

            for index in 0..32 {
                block[index] ^= previous[index];
            }
        }

        output.extend_from_slice(&block);
    }

    output.truncate(output_length);
    output
}

fn derive_password_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let key = pbkdf2_sha256(password.as_bytes(), salt, PBKDF2_ITERATIONS, 32);
    let mut output = [0_u8; 32];
    output.copy_from_slice(&key);

    output
}

fn password_verifier(key: &[u8; 32]) -> [u8; 32] {
    hmac_sha256(key, PASSWORD_VERIFIER_LABEL)
}

fn encryption_tag(key: &[u8; 32], nonce: &[u8; 12], payload: &[u8]) -> [u8; 32] {
    let mut data = Vec::with_capacity(ENCRYPTION_TAG_LABEL.len() + nonce.len() + payload.len());
    data.extend_from_slice(ENCRYPTION_TAG_LABEL);
    data.extend_from_slice(nonce);
    data.extend_from_slice(payload);

    hmac_sha256(key, &data)
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }

    let mut difference = 0_u8;

    for (left_byte, right_byte) in left.iter().zip(right.iter()) {
        difference |= left_byte ^ right_byte;
    }

    difference == 0
}

fn key_from_password(app: &AppHandle, password: &str) -> Result<[u8; 32], String> {
    let settings = read_settings(app);
    let security = settings.chat_history_security;

    if !security.encrypted {
        return Err("L'historique du chat n'est pas chiffre.".to_string());
    }

    let salt = security
        .salt
        .ok_or_else(|| "Le sel de chiffrement de l'historique est introuvable.".to_string())?;
    let expected_verifier = security.password_verifier.ok_or_else(|| {
        "Le verificateur de mot de passe de l'historique est introuvable.".to_string()
    })?;
    let salt = general_purpose::STANDARD
        .decode(salt)
        .map_err(|error| error.to_string())?;
    let expected_verifier = general_purpose::STANDARD
        .decode(expected_verifier)
        .map_err(|error| error.to_string())?;
    let key = derive_password_key(password, &salt);
    let actual_verifier = password_verifier(&key);

    if !constant_time_eq(&actual_verifier, &expected_verifier) {
        return Err("Mot de passe incorrect.".to_string());
    }

    Ok(key)
}

fn history_key_for_current_settings(app: &AppHandle) -> Result<Option<[u8; 32]>, String> {
    let settings = read_settings(app);

    if !settings.chat_history_security.encrypted {
        return Ok(None);
    }

    let key = current_session_key()?;

    if key.is_none() {
        return Err(
            "L'historique du chat est chiffre. Saisissez le mot de passe pour le deverrouiller."
                .to_string(),
        );
    }

    Ok(key)
}

fn chacha20_quarter_round(state: &mut [u32; 16], a: usize, b: usize, c: usize, d: usize) {
    state[a] = state[a].wrapping_add(state[b]);
    state[d] ^= state[a];
    state[d] = state[d].rotate_left(16);

    state[c] = state[c].wrapping_add(state[d]);
    state[b] ^= state[c];
    state[b] = state[b].rotate_left(12);

    state[a] = state[a].wrapping_add(state[b]);
    state[d] ^= state[a];
    state[d] = state[d].rotate_left(8);

    state[c] = state[c].wrapping_add(state[d]);
    state[b] ^= state[c];
    state[b] = state[b].rotate_left(7);
}

fn chacha20_block(key: &[u8; 32], nonce: &[u8; 12], counter: u32) -> [u8; 64] {
    let mut state = [0_u32; 16];
    state[0] = 0x6170_7865;
    state[1] = 0x3320_646e;
    state[2] = 0x7962_2d32;
    state[3] = 0x6b20_6574;

    for index in 0..8 {
        let offset = index * 4;
        state[4 + index] = u32::from_le_bytes([
            key[offset],
            key[offset + 1],
            key[offset + 2],
            key[offset + 3],
        ]);
    }

    state[12] = counter;

    for index in 0..3 {
        let offset = index * 4;
        state[13 + index] = u32::from_le_bytes([
            nonce[offset],
            nonce[offset + 1],
            nonce[offset + 2],
            nonce[offset + 3],
        ]);
    }

    let initial_state = state;

    for _ in 0..10 {
        chacha20_quarter_round(&mut state, 0, 4, 8, 12);
        chacha20_quarter_round(&mut state, 1, 5, 9, 13);
        chacha20_quarter_round(&mut state, 2, 6, 10, 14);
        chacha20_quarter_round(&mut state, 3, 7, 11, 15);
        chacha20_quarter_round(&mut state, 0, 5, 10, 15);
        chacha20_quarter_round(&mut state, 1, 6, 11, 12);
        chacha20_quarter_round(&mut state, 2, 7, 8, 13);
        chacha20_quarter_round(&mut state, 3, 4, 9, 14);
    }

    for index in 0..16 {
        state[index] = state[index].wrapping_add(initial_state[index]);
    }

    let mut block = [0_u8; 64];

    for (index, word) in state.iter().enumerate() {
        block[(index * 4)..((index + 1) * 4)].copy_from_slice(&word.to_le_bytes());
    }

    block
}

fn chacha20_apply(input: &[u8], nonce: &[u8; 12], key: &[u8; 32]) -> Vec<u8> {
    let mut output = Vec::with_capacity(input.len());

    for (block_index, chunk) in input.chunks(64).enumerate() {
        let block = chacha20_block(key, nonce, block_index.saturating_add(1) as u32);

        output.extend(
            chunk
                .iter()
                .zip(block.iter())
                .map(|(byte, mask)| byte ^ mask),
        );
    }

    output
}

fn plain_conversation_file(conversation: &ChatConversation) -> ConversationFile {
    ConversationFile {
        version: 1,
        encrypted: false,
        conversation: Some(conversation.clone()),
        nonce: None,
        payload: None,
        tag: None,
    }
}

fn encrypt_conversation(
    conversation: &ChatConversation,
    key: &[u8; 32],
) -> Result<ConversationFile, String> {
    let nonce = nonce();
    let plaintext = serde_json::to_vec(conversation).map_err(|error| error.to_string())?;
    let ciphertext = chacha20_apply(&plaintext, &nonce, key);
    let tag = encryption_tag(key, &nonce, &ciphertext);

    Ok(ConversationFile {
        version: 1,
        encrypted: true,
        conversation: None,
        nonce: Some(general_purpose::STANDARD.encode(nonce)),
        payload: Some(general_purpose::STANDARD.encode(ciphertext)),
        tag: Some(general_purpose::STANDARD.encode(tag)),
    })
}

fn decrypt_conversation(
    encrypted: &ConversationFile,
    key: &[u8; 32],
) -> Result<ChatConversation, String> {
    if encrypted.version != 1 {
        return Err("Version d'historique de chat non supportee.".to_string());
    }

    let nonce = encrypted
        .nonce
        .as_deref()
        .ok_or_else(|| "Nonce d'historique de chat introuvable.".to_string())?;
    let payload = encrypted
        .payload
        .as_deref()
        .ok_or_else(|| "Contenu chiffre de l'historique de chat introuvable.".to_string())?;
    let nonce = general_purpose::STANDARD
        .decode(nonce)
        .map_err(|error| error.to_string())?;
    let nonce: [u8; 12] = nonce
        .try_into()
        .map_err(|_| "Nonce d'historique de chat invalide.".to_string())?;
    let payload = general_purpose::STANDARD
        .decode(payload)
        .map_err(|error| error.to_string())?;

    if let Some(expected_tag) = encrypted.tag.as_deref() {
        let expected_tag = general_purpose::STANDARD
            .decode(expected_tag)
            .map_err(|error| error.to_string())?;
        let actual_tag = encryption_tag(key, &nonce, &payload);

        if !constant_time_eq(&actual_tag, &expected_tag) {
            return Err("Le contenu chiffre de l'historique est invalide.".to_string());
        }
    }

    let plaintext = chacha20_apply(&payload, &nonce, key);

    serde_json::from_slice(&plaintext).map_err(|error| error.to_string())
}

fn read_conversation(path: PathBuf, key: Option<&[u8; 32]>) -> Result<ChatConversation, String> {
    let contents = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let file: ConversationFile =
        serde_json::from_str(&contents).map_err(|error| error.to_string())?;

    if let Some(conversation) = file.conversation {
        return Ok(conversation);
    }

    if file.encrypted || (file.nonce.is_some() && file.payload.is_some()) {
        let key = key.ok_or_else(|| {
            "L'historique du chat est chiffre. Saisissez le mot de passe pour le deverrouiller."
                .to_string()
        })?;

        return decrypt_conversation(&file, key);
    }

    Err("Fichier d'historique de chat invalide.".to_string())
}

fn write_conversation(
    app: &AppHandle,
    conversation: &ChatConversation,
    key: Option<&[u8; 32]>,
) -> Result<(), String> {
    let history_dir = chat_history_dir(app)?;
    fs::create_dir_all(&history_dir).map_err(|error| error.to_string())?;

    let file = if let Some(key) = key {
        encrypt_conversation(conversation, key)?
    } else {
        plain_conversation_file(conversation)
    };
    let contents = serde_json::to_string(&file).map_err(|error| error.to_string())?;

    fs::write(conversation_path(app, &conversation.id)?, contents)
        .map_err(|error| error.to_string())
}

fn read_all_conversations(
    app: &AppHandle,
    key: Option<&[u8; 32]>,
) -> Result<Vec<ChatConversation>, String> {
    let history_dir = chat_history_dir(app)?;

    if !history_dir.exists() {
        return Ok(Vec::new());
    }

    let mut conversations = Vec::new();

    for entry in fs::read_dir(history_dir).map_err(|error| error.to_string())? {
        let path = entry.map_err(|error| error.to_string())?.path();
        let is_chat_file = path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension == "assistia-chat");

        if is_chat_file {
            conversations.push(read_conversation(path, key)?);
        }
    }

    Ok(conversations)
}

fn title_from_messages(messages: &[ChatHistoryMessage]) -> String {
    let title = messages
        .iter()
        .find(|message| message.role == "user")
        .or_else(|| messages.first())
        .map(|message| message.content.trim())
        .unwrap_or_default();

    let title = title
        .chars()
        .take(48)
        .collect::<String>()
        .replace('\n', " ");

    if title.is_empty() {
        "Conversation".to_string()
    } else {
        title
    }
}

fn normalize_conversation(mut conversation: ChatConversation) -> Result<ChatConversation, String> {
    validate_conversation_id(&conversation.id)?;

    let now = now_millis();

    if conversation.created_at == 0 {
        conversation.created_at = now;
    }

    conversation.updated_at = now;
    conversation.title = title_from_messages(&conversation.messages);
    conversation.selected_model = conversation.selected_model.trim().to_string();
    conversation.messages.retain(|message| {
        matches!(message.role.as_str(), "assistant" | "user") && !message.content.trim().is_empty()
    });

    Ok(conversation)
}

fn conversation_summary(conversation: ChatConversation) -> ChatConversationSummary {
    ChatConversationSummary {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        message_count: conversation.messages.len(),
    }
}

fn chat_history_security_state(app: &AppHandle) -> Result<ChatHistorySecurityState, String> {
    let settings = read_settings(app);
    let is_encrypted = settings.chat_history_security.encrypted;
    let is_unlocked = !is_encrypted || current_session_key()?.is_some();

    Ok(ChatHistorySecurityState {
        is_encrypted,
        is_unlocked,
    })
}

#[tauri::command]
pub fn get_chat_history_security_state(app: AppHandle) -> Result<ChatHistorySecurityState, String> {
    chat_history_security_state(&app)
}

#[tauri::command]
pub fn unlock_chat_history(
    app: AppHandle,
    password: String,
) -> Result<ChatHistorySecurityState, String> {
    if password.is_empty() {
        return Err("Saisissez le mot de passe de l'historique.".to_string());
    }

    let key = key_from_password(&app, &password)?;
    set_session_key(Some(key))?;

    chat_history_security_state(&app)
}

#[tauri::command]
pub fn set_chat_history_password(
    app: AppHandle,
    current_password: Option<String>,
    new_password: String,
) -> Result<ChatHistorySecurityState, String> {
    if new_password.is_empty() {
        return Err("Le nouveau mot de passe ne peut pas etre vide.".to_string());
    }

    let settings = read_settings(&app);
    let current_key = if settings.chat_history_security.encrypted {
        if let Some(password) = current_password
            .as_deref()
            .filter(|password| !password.is_empty())
        {
            Some(key_from_password(&app, password)?)
        } else {
            Some(current_session_key()?.ok_or_else(|| {
                "Saisissez le mot de passe actuel avant de le modifier.".to_string()
            })?)
        }
    } else {
        None
    };
    let conversations = read_all_conversations(&app, current_key.as_ref())?;
    let salt = random_bytes::<16>();
    let new_key = derive_password_key(&new_password, &salt);
    let new_verifier = password_verifier(&new_key);
    let mut settings = settings;

    for conversation in &conversations {
        write_conversation(&app, conversation, Some(&new_key))?;
    }

    settings.chat_history_security.encrypted = true;
    settings.chat_history_security.salt = Some(general_purpose::STANDARD.encode(salt));
    settings.chat_history_security.password_verifier =
        Some(general_purpose::STANDARD.encode(new_verifier));

    write_settings(&app, &settings)?;
    set_session_key(Some(new_key))?;

    chat_history_security_state(&app)
}

#[tauri::command]
pub fn reset_chat_history(app: AppHandle) -> Result<ChatHistorySecurityState, String> {
    let history_dir = chat_history_dir(&app)?;

    if history_dir.exists() {
        fs::remove_dir_all(history_dir).map_err(|error| error.to_string())?;
    }

    let mut settings = read_settings(&app);
    settings.chat_history_security.encrypted = false;
    settings.chat_history_security.salt = None;
    settings.chat_history_security.password_verifier = None;

    write_settings(&app, &settings)?;
    set_session_key(None)?;

    chat_history_security_state(&app)
}

#[tauri::command]
pub fn list_chat_conversations(app: AppHandle) -> Result<Vec<ChatConversationSummary>, String> {
    let key = history_key_for_current_settings(&app)?;
    let mut conversations = read_all_conversations(&app, key.as_ref())?
        .into_iter()
        .map(conversation_summary)
        .collect::<Vec<_>>();

    conversations.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));

    Ok(conversations)
}

#[tauri::command]
pub fn get_chat_conversation(app: AppHandle, id: String) -> Result<ChatConversation, String> {
    let key = history_key_for_current_settings(&app)?;

    read_conversation(conversation_path(&app, &id)?, key.as_ref())
}

#[tauri::command]
pub fn save_chat_conversation(
    app: AppHandle,
    conversation: ChatConversation,
) -> Result<ChatConversationSummary, String> {
    let key = history_key_for_current_settings(&app)?;
    let conversation = normalize_conversation(conversation)?;

    write_conversation(&app, &conversation, key.as_ref())?;

    Ok(conversation_summary(conversation))
}

#[tauri::command]
pub fn delete_chat_conversation(app: AppHandle, id: String) -> Result<(), String> {
    let path = conversation_path(&app, &id)?;

    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }

    Ok(())
}
