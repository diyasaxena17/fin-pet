#include "http_server.hpp"
#include "game_logic.hpp"
#include "demo.hpp"
#include <cstdlib>
#include <iostream>

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
    if (argc > 2 || (argc == 2 && std::string(argv[1]) != "--seed-forest-demo"))
      throw std::runtime_error("Usage: mochi-api [--seed-forest-demo]");
    const bool seed_demo = argc == 2;
    const bool demo_mode = flag("DEMO_MODE"), device_api = flag("ENABLE_DEVICE_API");
    if (seed_demo && (!demo_mode || env("DB_PATH", "").empty()))
      throw std::runtime_error("Forest demo seeding requires DEMO_MODE=true and an explicit DB_PATH");
    const auto port_text = env("PORT", "3000");
    std::size_t used = 0;
    const auto port = std::stoi(port_text, &used);
    if (used != port_text.size() || port < 1 || port > 65535) throw std::runtime_error("PORT must be 1..65535");
    mochi::configure_timezone(env("DEMO_TIME_ZONE", "America/Toronto"));
    const auto db_path = env("DB_PATH", MOCHI_DEFAULT_DB);
    if (db_path.empty()) throw std::runtime_error("DB_PATH must not be empty");
    mochi::Database db(db_path);
    if (seed_demo) {
      const auto added = mochi::seed_forest_demo(db);
      std::cout << mochi::Json{{"seededTransactions", added}}.dump() << std::endl;
      return 0;
    }
    httplib::Server server;
    mochi::configure_server(server, db, {demo_mode, device_api});
    const auto host = env("API_HOST", "0.0.0.0");
    std::cout << "Mochi C++ API listening at http://" << host << ':' << port << std::endl;
    if (!server.listen(host, port)) throw std::runtime_error("Could not bind API_HOST/PORT");
  } catch (const std::exception& error) {
    std::cerr << "Mochi startup failed: " << error.what() << '\n';
    return 1;
  }
}
