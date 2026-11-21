#include "http_server.hpp"
#include "game_logic.hpp"
#include "demo.hpp"
#include "sandbox.hpp"
#include <fcntl.h>
#include <sys/file.h>
#include <unistd.h>
#include <cstdlib>
#include <iostream>
#include <filesystem>

namespace {
std::string env(const char* name, const std::string& fallback) {
  const char* value = std::getenv(name);
  return value ? value : fallback;
}
bool flag(const char* name) {
  auto value = env(name, "false");
  if (value != "true" && value != "false") throw std::runtime_error(std::string(name) + " must be true or false");
  return value == "true";
}
}
int main(int argc, char** argv) {
  try {
    const std::string command = argc > 1 ? argv[1] : "";
    const bool seed_demo = command == "--seed-forest-demo";
    const bool seed_sandbox = command == "--seed-sandbox";
    const bool select_day = command == "--sandbox-day";
    const bool export_ledger = command == "--sandbox-ledger";
    if ((argc != 1 && !seed_demo && !seed_sandbox && !select_day && !export_ledger) ||
        (select_day ? argc != 3 : argc > 2))
      throw std::runtime_error("Usage: mochi-api [--seed-forest-demo | --seed-sandbox | --sandbox-day 1..14 | --sandbox-ledger]");
    const bool sandbox = seed_sandbox || select_day || export_ledger || flag("DEMO_SANDBOX");
    const bool demo_mode = flag("DEMO_MODE"), device_api = flag("ENABLE_DEVICE_API");
    if (sandbox && (!demo_mode || env("DB_PATH", "").empty()))
      throw std::runtime_error("Sandbox requires DEMO_MODE=true, explicit DB_PATH");
    if (seed_demo && (!demo_mode || env("DB_PATH", "").empty()))
      throw std::runtime_error("Forest demo seeding requires DEMO_MODE=true and an explicit DB_PATH");
    const auto port_text = env("PORT", "3000");
    std::size_t used = 0;
    const auto port = std::stoi(port_text, &used);
    if (used != port_text.size() || port < 1 || port > 65535) throw std::runtime_error("PORT must be 1..65535");
    mochi::configure_timezone(env("DEMO_TIME_ZONE", "America/Toronto"));
    const auto db_path = env("DB_PATH", MOCHI_DEFAULT_DB);
    if (db_path.empty()) throw std::runtime_error("DB_PATH must not be empty");
    // Sandbox is a separate database. Never open or migrate the supplied real DB.
    const auto active_path = sandbox ? db_path + ".sandbox14.sqlite3" : db_path;
    struct Lease {
      int fd = -1;
      ~Lease() { if (fd >= 0) ::close(fd); }
    } lease;
    if (sandbox) {
      if (db_path == ":memory:") throw std::runtime_error("Sandbox requires a persistent DB_PATH");
      const auto parent = std::filesystem::path(active_path).parent_path();
      if (!parent.empty()) std::filesystem::create_directories(parent);
      lease.fd = ::open((active_path + ".lock").c_str(), O_CREAT | O_RDWR, 0600);
      if (lease.fd < 0 || flock(lease.fd, LOCK_EX | LOCK_NB) != 0)
        throw std::runtime_error("Stop the sandbox server before selecting/exporting another day");
    }
    mochi::Database db(active_path, sandbox);
    if (sandbox) {
      auto metadata = db.sandbox_metadata();
      if (!metadata.is_null() && metadata.value("dataset", "") != "mochi-sandbox-14-v1")
        throw std::runtime_error("Unsupported sandbox dataset version");
      if (!metadata.is_null() && metadata.value("timeZone", "") != env("DEMO_TIME_ZONE", "America/Toronto"))
        throw std::runtime_error("Existing sandbox timezone is immutable; use its original DEMO_TIME_ZONE");
      if (export_ledger && metadata.is_null()) throw std::runtime_error("Seed the sandbox before exporting its ledger");
      const auto requested_start = env("DEMO_SANDBOX_START", "");
      if (!metadata.is_null() && !requested_start.empty() && requested_start != metadata.at("startDate").get<std::string>())
        throw std::runtime_error("Existing sandbox start date is immutable; choose a new DB_PATH");
      if (metadata.is_null() || select_day || seed_sandbox || seed_demo) {
        auto start = metadata.is_null() ? requested_start : metadata.at("startDate").get<std::string>();
        if (start.empty()) { start = mochi::local_day(); for (int i = 0; i < 13; ++i) start = mochi::previous_day(start); }
        int day = 14;
        if (select_day) {
          std::size_t parsed = 0; const std::string text = argv[2]; day = std::stoi(text, &parsed);
          if (parsed != text.size()) throw std::runtime_error("Sandbox day must be an integer from 1 to 14");
        }
        const auto schedule = metadata.is_null() ? mochi::Json(nullptr) : metadata.at("schedule");
        auto snapshot = mochi::sandbox_snapshot(start, day, schedule);
        snapshot["metadata"]["timeZone"] = env("DEMO_TIME_ZONE", "America/Toronto");
        db.save_sandbox(snapshot);
        metadata = db.sandbox_metadata();
      }
      mochi::set_demo_clock(metadata.at("clockMillis"));
      if (seed_sandbox || select_day || export_ledger || seed_demo) {
        std::cout << mochi::sandbox_ledger(metadata).dump(2) << std::endl; return 0;
      }
    }
    if (seed_demo) {
      const auto added = mochi::seed_forest_demo(db);
      std::cout << mochi::Json{{"seededTransactions", added}}.dump() << std::endl;
      return 0;
    }
    httplib::Server server;
    mochi::configure_server(server, db, {demo_mode, sandbox ? false : device_api, sandbox});
    const auto host = env("API_HOST", "0.0.0.0");
    std::cout << "Mochi C++ API listening at http://" << host << ':' << port << std::endl;
    if (!server.listen(host, port)) throw std::runtime_error("Could not bind API_HOST/PORT");
  } catch (const std::exception& error) {
    std::cerr << "Mochi startup failed: " << error.what() << '\n';
    return 1;
  }
}
