#pragma once
#include "app_state.hpp"
#include <functional>
#include <mutex>
#include <sqlite3.h>

namespace mochi {
class Database {
 public:
  explicit Database(const std::string& path);
  ~Database();
  Database(const Database&) = delete;
  Database& operator=(const Database&) = delete;
  Json read();
  // Callback and request ID insertion run inside the same BEGIN IMMEDIATE.
  Json mutate(const std::string& request_id, const std::string& endpoint,
              const Json& input, const std::function<void(Json&)>& apply,
              bool reset = false);
 private:
  sqlite3* db_ = nullptr;
  std::mutex mutex_;
  void exec(const char* sql);
  Json load(bool allow_v1 = false);
  void migrate(int version);
};
}
