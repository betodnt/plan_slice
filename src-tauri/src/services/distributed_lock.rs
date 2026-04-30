use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub struct DistributedLock {
    pub lock_dir: PathBuf,
    pub instance_id: String,
    pub timeout: Duration,
}

impl DistributedLock {
    pub fn new(lock_dir: PathBuf, instance_id: String, timeout_secs: u64) -> Self {
        Self {
            lock_dir,
            instance_id,
            timeout: Duration::from_secs(timeout_secs),
        }
    }

    pub fn try_acquire(&self, machine: &str) -> Result<bool, String> {
        self.try_acquire_internal(machine, 0)
    }

    fn try_acquire_internal(&self, machine: &str, depth: u32) -> Result<bool, String> {
        if depth > 2 {
            return Err("Limite de recursão atingido ao tentar adquirir lock".to_string());
        }

        let lock_file = self.lock_path(machine);

        if let Some(parent) = lock_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Falha ao criar pasta de locks: {}", e))?;
        }

        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_file)
        {
            Ok(mut file) => {
                let now = self.now_timestamp()?;
                let content = format!("{}\n{}", self.instance_id, now);
                file.write_all(content.as_bytes())
                    .map_err(|e| format!("Falha ao escrever no arquivo de lock: {}", e))?;
                Ok(true)
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                let content = fs::read_to_string(&lock_file)
                    .map_err(|e| format!("Falha ao ler lock existente: {}", e))?;
                let lines: Vec<&str> = content.lines().collect();

                if lines.len() >= 2 {
                    let timestamp: i64 = lines[1].parse().unwrap_or(0);
                    let now = self.now_timestamp()?;

                    if (now - timestamp) > self.timeout.as_secs() as i64 {
                        // Lock expirado
                        let _ = fs::remove_file(&lock_file);
                        return self.try_acquire_internal(machine, depth + 1);
                    }
                } else {
                    // Arquivo de lock malformado ou vazio, vamos tentar remover
                    let _ = fs::remove_file(&lock_file);
                    return self.try_acquire_internal(machine, depth + 1);
                }

                Ok(false)
            }
            Err(e) => Err(format!("Erro de I/O ao tentar adquirir lock: {}", e)),
        }
    }

    pub fn refresh(&self, machine: &str) -> Result<(), String> {
        let lock_file = self.lock_path(machine);
        if !lock_file.exists() {
            return Err("Arquivo de lock não encontrado para atualização".to_string());
        }

        let file = fs::File::open(&lock_file)
            .map_err(|e| format!("Falha ao abrir lock para refresh: {}", e))?;
        let mut reader = BufReader::new(file);
        let mut first_line = String::new();
        reader.read_line(&mut first_line)
            .map_err(|e| format!("Falha ao ler lock: {}", e))?;

        if first_line.trim() != self.instance_id {
            return Err("Este lock pertence a outra instância".to_string());
        }

        let now = self.now_timestamp()?;
        let content = format!("{}\n{}", self.instance_id, now);
        fs::write(&lock_file, content)
            .map_err(|e| format!("Falha ao atualizar lock: {}", e))?;

        Ok(())
    }

    pub fn release(&self, machine: &str) -> Result<(), String> {
        let lock_file = self.lock_path(machine);
        if !lock_file.exists() {
            return Ok(());
        }

        let content = fs::read_to_string(&lock_file)
            .map_err(|e| format!("Falha ao ler lock para liberação: {}", e))?;
        let first_line = content.lines().next().unwrap_or("");

        if first_line.trim() == self.instance_id {
            fs::remove_file(&lock_file)
                .map_err(|e| format!("Falha ao remover arquivo de lock: {}", e))?;
        }

        Ok(())
    }

    fn lock_path(&self, machine: &str) -> PathBuf {
        let safe_machine = machine.replace(|c: char| !c.is_alphanumeric(), "_");
        self.lock_dir.join(format!("{}.lock", safe_machine))
    }

    fn now_timestamp(&self) -> Result<i64, String> {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .map_err(|e| format!("Erro de sistema de tempo: {}", e))
    }
}
