#include "http_server.hpp"

namespace mochi {
namespace {
void reply(httplib::Response& res, const Json& body, int status = 200) {
  res.status = status;
  res.set_header("Cache-Control", "no-store");
  res.set_content(body.dump(), "application/json");
}
}
void configure_server(httplib::Server& server, Database& db, Options) {
  server.set_payload_max_length(64 * 1024);
  server.Get("/health", [](const auto&, auto& res) { reply(res, {{"ok", true}}); });
  server.Get("/api/state", [&db](const auto&, auto& res) { reply(res, app_state(db.read())); });
  server.set_error_handler([](const auto&, auto& res) {
    if (res.body.empty()) reply(res, {{"error", {{"code", "NOT_FOUND"}, {"message", "Route not found."}}}}, 404);
  });
  server.set_exception_handler([](const auto&, auto& res, std::exception_ptr) {
    reply(res, {{"error", {{"code", "INTERNAL_ERROR"}, {"message", "Unable to save Mochi. Retry with the same request ID."}}}}, 500);
  });
}
}
