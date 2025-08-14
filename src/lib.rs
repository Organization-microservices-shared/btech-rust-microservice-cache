use dashmap::DashMap;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize, Deserialize)]

struct CacheEntry {
  value: String,
  created_at: u64,
  expires_at: Option<u64>,
  access_count: u64,
  last_accessed: u64,
  tags: Vec<String>,
  original_key: String,
}

impl CacheEntry {
  fn new(value: String, ttl_seconds: Option<u32>, tags: Vec<String>, original_key: String) -> Self {
    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_secs();

    let expires_at = ttl_seconds.map(|ttl| now + ttl as u64);

    Self {
      value,
      created_at: now,
      expires_at,
      access_count: 0,
      last_accessed: now,
      tags,
      original_key,
    }
  }

  fn is_expired(&self) -> bool {
    if let Some(expires_at) = self.expires_at {
      let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
      now > expires_at
    } else {
      false
    }
  }

  fn touch(&mut self) {
    self.access_count += 1;
    self.last_accessed = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_secs();
  }
}

#[napi]
pub struct MicroserviceCache {
  storage: Arc<DashMap<String, CacheEntry>>,
  max_size: usize,
  default_ttl: Option<u32>,
  stats: Arc<DashMap<String, u64>>,
}

#[napi]
impl MicroserviceCache {
  #[napi(constructor)]
  pub fn new(max_size: Option<u32>, default_ttl_seconds: Option<u32>) -> Self {
    Self {
      storage: Arc::new(DashMap::new()),
      max_size: max_size.unwrap_or(10000) as usize,
      default_ttl: default_ttl_seconds,
      stats: Arc::new(DashMap::new()),
    }
  }

  #[napi]
  pub fn set(
    &self,
    key: String,
    value: String,
    ttl_seconds: Option<u32>,
    tags: Option<Vec<String>>,
  ) -> Result<bool> {
    let key_hash = self.hash_key(&key);
    let effective_ttl = ttl_seconds.or(self.default_ttl);
    let tags = tags.unwrap_or_default();

    let entry = CacheEntry::new(value, effective_ttl, tags, key.clone());

    if self.storage.len() >= self.max_size {
      self.evict_lru()?;
    }

    self.storage.insert(key_hash, entry);
    self.increment_stat("sets");

    Ok(true)
  }

  #[napi]
  pub fn get(&self, key: String) -> Option<String> {
    let key_hash = self.hash_key(&key);

    if let Some(mut entry_ref) = self.storage.get_mut(&key_hash) {
      if entry_ref.is_expired() {
        drop(entry_ref);
        self.storage.remove(&key_hash);
        self.increment_stat("expired_hits");
        return None;
      }

      entry_ref.touch();
      let value = entry_ref.value.clone();
      self.increment_stat("hits");
      Some(value)
    } else {
      self.increment_stat("misses");
      None
    }
  }

  #[napi]
  pub fn delete(&self, key: String) -> bool {
    let key_hash = self.hash_key(&key);
    let removed = self.storage.remove(&key_hash).is_some();
    if removed {
      self.increment_stat("deletes");
    }
    removed
  }

  #[napi]
  pub fn get_stats(&self) -> String {
    let total_keys = self.storage.len();
    let mut stats = std::collections::HashMap::new();

    stats.insert("total_keys".to_string(), total_keys as u64);
    stats.insert("max_size".to_string(), self.max_size as u64);

    for entry in self.stats.iter() {
      stats.insert(entry.key().clone(), *entry.value());
    }

    let hits = stats.get("hits").unwrap_or(&0);
    let misses = stats.get("misses").unwrap_or(&0);
    let total_requests = hits + misses;

    if total_requests > 0 {
      let hit_rate = (*hits as f64 / total_requests as f64 * 100.0) as u64;
      stats.insert("hit_rate_percent".to_string(), hit_rate);
    }

    serde_json::to_string(&stats).unwrap_or_default()
  }

  #[napi]
  pub fn get_all_keys(&self) -> Vec<String> {
    let mut keys = Vec::new();

    for entry in self.storage.iter() {
      if !entry.is_expired() {
        keys.push(entry.original_key.clone());
      }
    }

    keys
  }

  #[napi]
  pub fn flush(&self) -> u32 {
    let count = self.storage.len() as u32;
    self.storage.clear();
    self.increment_stat("flushes");
    count
  }

  fn hash_key(&self, key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(key.as_bytes());
    format!("{:x}", hasher.finalize())
  }

  fn increment_stat(&self, stat_name: &str) {
    self
      .stats
      .entry(stat_name.to_string())
      .and_modify(|v| *v += 1)
      .or_insert(1);
  }

  fn evict_lru(&self) -> Result<()> {
    let mut oldest_key: Option<String> = None;
    let mut oldest_time = u64::MAX;

    for entry in self.storage.iter() {
      if entry.last_accessed < oldest_time {
        oldest_time = entry.last_accessed;
        oldest_key = Some(entry.key().clone());
      }
    }

    if let Some(key) = oldest_key {
      self.storage.remove(&key);
      self.increment_stat("evictions");
    }

    Ok(())
  }
}
