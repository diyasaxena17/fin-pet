#include "http_server.hpp"
#include "game_logic.hpp"
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
int main() {
  try {
    const auto port_text = env("PORT", "3000");
    std::size_t used = 0;
    const auto port = std::stoi(port_text, &used);
    if (used != port_text.size() || port < 1 || port > 65535) throw std::runtime_error("PORT must be 1..65535");
    mochi::configure_timezone(env("DEMO_TIME_ZONE", "America/Toronto"));
    const auto db_path = env("DB_PATH", MOCHI_DEFAULT_DB);
    if (db_path.empty()) throw std::runtime_error("DB_PATH must not be empty");
    mochi::Database db(db_path);
    httplib::Server server;
    mochi::configure_server(server, db, {flag("DEMO_MODE"), flag("ENABLE_DEVICE_API")});
    const auto host = env("API_HOST", "0.0.0.0");
    std::cout << "Mochi C++ API listening at http://" << host << ':' << port << std::endl;
    if (!server.listen(host, port)) throw std::runtime_error("Could not bind API_HOST/PORT");
  } catch (const std::exception& error) {
    std::cerr << "Mochi startup failed: " << error.what() << '\n';
    return 1;
  }
}
