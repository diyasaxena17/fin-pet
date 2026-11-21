#include "database.hpp"
#include "game_logic.hpp"
#include "finance.hpp"
#include <filesystem>
#include <memory>

namespace mochi {
namespace {
class Statement {
 public:
  sqlite3_stmt* stmt = nullptr;
  explicit Statement(sqlite3* db, const char* sql) {
    if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK)
      throw std::runtime_error(sqlite3_errmsg(db));
  }
  ~Statement() { sqlite3_finalize(stmt); }
  Statement(const Statement&) = delete;
  Statement& operator=(const Statement&) = delete;
  void text(int index, const std::string& text) {
    if (sqlite3_bind_text(stmt, index, text.data(), static_cast<int>(text.size()), SQLITE_TRANSIENT) != SQLITE_OK)
      throw std::runtime_error("SQLite bind failed");
  }
  void done() {
    if (sqlite3_step(stmt) != SQLITE_DONE) throw std::runtime_error("SQLite write failed");
  }
};
void require_primary_key(sqlite3* db, const char* pragma, const std::string& key) {
  Statement columns(db, pragma);
  int key_columns = 0;
  bool found = false;
  int result;
  while ((result = sqlite3_step(columns.stmt)) == SQLITE_ROW) {
    if (sqlite3_column_int(columns.stmt, 5) == 0) continue;
    ++key_columns;
    found = key == reinterpret_cast<const char*>(sqlite3_column_text(columns.stmt, 1));
  }
  if (result != SQLITE_DONE || key_columns != 1 || !found)
    throw std::runtime_error("Incompatible Mochi database primary key");
}
void validate_current_state(const Json& state) {
  validate_stored_state(state);
  if (!state.contains("finance")) throw std::runtime_error("Missing finance state");
}
std::string canonical_endpoint(const std::string& endpoint) {
  return endpoint == "/api/quests/complete" ? "/api/check-ins" : endpoint;
}
bool structured_endpoint(const std::string& endpoint) {
  const auto& path = endpoint;
  return path == "/api/check-ins" || path == "/api/transactions" || path == "/api/reflections" || path == "/api/lessons/answer";
}
Json canonical_input(const std::string& endpoint, Json input) {
  if (endpoint == "/api/quests/complete") input.erase("questId");
  return input;
}

}
void Database::exec(const char* sql) {
  if (sqlite3_exec(db_, sql, nullptr, nullptr, nullptr) != SQLITE_OK)
    throw std::runtime_error(sqlite3_errmsg(db_));
}
Database::Database(const std::string& path) {
  if (path != ":memory:") {
    const auto parent = std::filesystem::path(path).parent_path();
    if (!parent.empty()) std::filesystem::create_directories(parent);
  }
  if (sqlite3_open_v2(path.c_str(), &db_, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nullptr) != SQLITE_OK) {
    const std::string message = db_ ? sqlite3_errmsg(db_) : "SQLite open failed";
    sqlite3_close(db_);
    db_ = nullptr;
    throw std::runtime_error(message);
  }
  try {
    sqlite3_busy_timeout(db_, 5000);
    exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
    exec("BEGIN IMMEDIATE");
    {
      Statement version(db_, "PRAGMA user_version");
      if (sqlite3_step(version.stmt) != SQLITE_ROW) throw std::runtime_error("Cannot read database version");
      const int schema_version = sqlite3_column_int(version.stmt, 0);
      Statement tables(db_, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      if (sqlite3_step(tables.stmt) != SQLITE_ROW) throw std::runtime_error("Cannot read database schema");
      const bool fresh = sqlite3_column_int(tables.stmt, 0) == 0 && schema_version == 0;
      if (fresh) {
        exec("CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);"
             "CREATE TABLE processed_requests (request_id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, payload TEXT NOT NULL);"
             "CREATE TABLE decisions (request_id TEXT PRIMARY KEY, payload TEXT NOT NULL);"
             "PRAGMA user_version=1;");
        Statement insert(db_, "INSERT INTO app_state(id,payload) VALUES(1,?)");
        insert.text(1, empty_state().dump()); insert.done();
      }
      migrate(fresh ? 1 : schema_version);
    }
    (void)load();
    // Prepare all tables now, so an incompatible schema fails before listening.
    Statement ids(db_, "SELECT request_id,endpoint,payload FROM processed_requests LIMIT 0");
    Statement decisions(db_, "SELECT request_id,payload FROM decisions LIMIT 0");
    require_primary_key(db_, "PRAGMA table_info(app_state)", "id");
    require_primary_key(db_, "PRAGMA table_info(processed_requests)", "request_id");
    require_primary_key(db_, "PRAGMA table_info(decisions)", "request_id");
    exec("COMMIT");
  } catch (...) {
    sqlite3_exec(db_, "ROLLBACK", nullptr, nullptr, nullptr);
    sqlite3_close(db_); db_ = nullptr; throw;
  }
}
// Called only inside startup's transaction: schema, payload, version and final
// compatibility checks must all succeed before any upgrade becomes durable.
void Database::migrate(int version) {
  if (version < 1 || version > 2)
    throw std::runtime_error("Incompatible Mochi database schema");
  if (version == 1) {
    auto state = load(true);
    if (!state.contains("finance")) state["finance"] = empty_finance();
    validate_current_state(state);
    Statement upgrade(db_, "UPDATE app_state SET payload=? WHERE id=1");
    upgrade.text(1, state.dump()); upgrade.done();
    exec("PRAGMA user_version=2");
  }
}
Database::~Database() { sqlite3_close(db_); }
Json Database::load(bool allow_v1) {
  Statement query(db_, "SELECT payload FROM app_state WHERE id=1");
  if (sqlite3_step(query.stmt) != SQLITE_ROW) throw std::runtime_error("Missing persisted state");
  auto state = Json::parse(reinterpret_cast<const char*>(sqlite3_column_text(query.stmt, 0)));
  if (allow_v1) validate_stored_state(state);
  else validate_current_state(state);
  return state;
}
Json Database::read() {
  std::lock_guard lock(mutex_);
  return load();
}
Json Database::mutate(const std::string& id, const std::string& endpoint,
                      const Json& input, const std::function<void(Json&)>& apply, bool reset) {
  std::lock_guard lock(mutex_);
  exec("BEGIN IMMEDIATE");
  try {
    auto state = load();
    if (!id.empty()) {
      Statement query(db_, "SELECT endpoint,payload FROM processed_requests WHERE request_id=?");
      query.text(1, id);
      const int result = sqlite3_step(query.stmt);
      if (result == SQLITE_ROW) {
        const std::string previous = reinterpret_cast<const char*>(sqlite3_column_text(query.stmt, 0));
        const auto previous_input = Json::parse(reinterpret_cast<const char*>(sqlite3_column_text(query.stmt, 1)));
        if ((structured_endpoint(endpoint) || structured_endpoint(previous)) &&
            (canonical_endpoint(endpoint) != canonical_endpoint(previous) || canonical_input(endpoint, input) != canonical_input(previous, previous_input)))
          throw ApiError(409, "REQUEST_ID_CONFLICT", "This request ID belongs to another operation.");
        exec("COMMIT"); return state;
      }
      if (result != SQLITE_DONE) throw std::runtime_error("SQLite request lookup failed");
    }
    apply(state);
    validate_current_state(state);
    Statement save(db_, "UPDATE app_state SET payload=? WHERE id=1");
    save.text(1, state.dump());
    save.done();
    if (reset) exec("DELETE FROM processed_requests; DELETE FROM decisions;");
    if (!id.empty()) {
      Statement insert(db_, "INSERT INTO processed_requests(request_id,endpoint,payload) VALUES(?,?,?)");
      insert.text(1, id); insert.text(2, endpoint); insert.text(3, input.dump()); insert.done();
      if (endpoint == "/api/decisions") {
        Statement decision(db_, "INSERT INTO decisions(request_id,payload) VALUES(?,?)");
        auto stored_decision = input;
        stored_decision["amountCents"] = money_cents(input.at("amount"));
        stored_decision.erase("amount");
        stored_decision["createdAtEpoch"] = std::time(nullptr);
        decision.text(1, id); decision.text(2, stored_decision.dump()); decision.done();
      }
    }
    exec("COMMIT");
    return state;
  } catch (...) {
    sqlite3_exec(db_, "ROLLBACK", nullptr, nullptr, nullptr);
    throw;
  }
}
}
