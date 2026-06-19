use crate::common::{
    command_output_with_timeout, hide_command_window, home_dir, OPEN_WEBUI_PYTHON_VERSION,
};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

#[derive(Clone)]
pub(crate) struct CommandSpec {
    program: String,
    args: Vec<String>,
}

impl CommandSpec {
    pub(crate) fn command(&self) -> Command {
        let mut command = Command::new(&self.program);
        command.args(&self.args);
        hide_command_window(&mut command);
        command
    }
}

fn python_311_candidates() -> Vec<CommandSpec> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "windows")]
    {
        candidates.push(CommandSpec {
            program: "py".to_string(),
            args: vec!["-3.11".to_string()],
        });
    }

    candidates.extend([
        CommandSpec {
            program: "python3.11".to_string(),
            args: Vec::new(),
        },
        CommandSpec {
            program: "python3".to_string(),
            args: Vec::new(),
        },
        CommandSpec {
            program: "python".to_string(),
            args: Vec::new(),
        },
    ]);

    candidates
}

fn command_version_output(mut command: Command, description: &str) -> Option<String> {
    command.arg("--version");

    let output = command_output_with_timeout(command, Duration::from_secs(3), description).ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    Some(if stdout.is_empty() { stderr } else { stdout })
}

fn command_version(command_spec: &CommandSpec, description: &str) -> Option<String> {
    command_version_output(command_spec.command(), description)
}

pub(crate) fn executable_version(executable_path: &Path, description: &str) -> Option<String> {
    let mut command = Command::new(executable_path);
    hide_command_window(&mut command);

    command_version_output(command, description)
}

pub(crate) fn is_python_311_version(version: &str) -> bool {
    version.starts_with(&format!("Python {OPEN_WEBUI_PYTHON_VERSION}."))
}

fn is_python_311(command_spec: &CommandSpec) -> bool {
    command_version(command_spec, "Python").is_some_and(|version| is_python_311_version(&version))
}

pub(crate) fn find_python_311() -> Option<CommandSpec> {
    python_311_candidates().into_iter().find(is_python_311)
}

fn uv_executable_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "uv.exe"
    }

    #[cfg(not(target_os = "windows"))]
    {
        "uv"
    }
}

fn uv_executable_candidates() -> Vec<PathBuf> {
    let executable_name = uv_executable_name();
    let mut candidates = Vec::new();

    if let Some(path) = env::var_os("PATH") {
        candidates.extend(env::split_paths(&path).map(|path| path.join(executable_name)));
    }

    if let Some(home_dir) = home_dir() {
        candidates.push(home_dir.join(".local").join("bin").join(executable_name));
        candidates.push(home_dir.join(".cargo").join("bin").join(executable_name));
    }

    candidates
}

pub(crate) fn find_uv() -> Option<PathBuf> {
    uv_executable_candidates()
        .into_iter()
        .find(|candidate| candidate.exists())
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
pub(crate) fn uv_install_command() -> Command {
    let mut command = Command::new("sh");
    command
        .arg("-c")
        .arg("curl -LsSf https://astral.sh/uv/install.sh | sh");
    hide_command_window(&mut command);
    command
}

#[cfg(target_os = "windows")]
pub(crate) fn uv_install_command() -> Command {
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "irm https://astral.sh/uv/install.ps1 | iex",
    ]);
    hide_command_window(&mut command);
    command
}
