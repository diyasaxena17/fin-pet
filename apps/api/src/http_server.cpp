#include "http_server.hpp"
#include "game_logic.hpp"
#include "finance.hpp"
#include "engagement.hpp"
#include "learning.hpp"

namespace mochi {
namespace {
void reply(httplib::Response& res, const Json& body, int status = 200) {
  res.status = status;
  res.set_header("Cache-Control", "no-store");
  res.set_content(body.dump(), "application/json");
}
void mutate(Database& db, Action action, const httplib::Request& req, httplib::Response& res) {
  Json input;
  try {
    const auto content_type = req.get_header_value("Content-Type");
    if (!std::regex_match(content_type, std::regex(R"(^application/json(\s*;.*)?$)", std::regex::icase)))
      throw ApiError(400, "INVALID_REQUEST", "Send a JSON request body.");
    input = validate_input(action, Json::parse(req.body, [](int depth, Json::parse_event_t, Json&) {
      if (depth > 16) throw ApiError(400, "INVALID_REQUEST", "JSON is too deeply nested.");
      return true;
    }));
  } catch (const ApiError& error) {
    reply(res, {{"error", {{"code", error.code}, {"message", error.what()}}}}, error.status);
    return;
  } catch (const Json::exception&) {
    reply(res, {{"error", {{"code", "INVALID_REQUEST"}, {"message", "Invalid JSON request."}}}}, 400);
    return;
  }
  try {
    const auto day = local_day();
    Json reward = {{"coins", 0}, {"xp", 0}};
    const auto stored = db.mutate(input.value("requestId", std::string{}), req.path, input,
      [&](Json& state) {
        const auto before = state.at("account");
        apply_action(state, action, input, day);
        if ((action == Action::check_in || action == Action::lesson) && !before.is_null())
          reward = {{"coins", state.at("account").at("coins").get<std::int64_t>() - before.at("coins").get<std::int64_t>()},
                    {"xp", state.at("account").at("xp").get<std::int64_t>() - before.at("xp").get<std::int64_t>()}};
      }, action == Action::reset);
    if (action == Action::gesture) reply(res, device_state(stored));
    else if (action == Action::reflection) reply(res, reflection_response(stored, input, day));
    else if (action == Action::lesson) reply(res, lesson_response(stored, input, day, reward));
    else if (action == Action::check_in) {
      const auto view = app_state(stored, day);
      reply(res, {{"completedToday", view.at("quest").at("completedToday")}, {"reward", reward}, {"state", view}});
    } else reply(res, finance_mutation_response(action, stored, input, day));
  } catch (const ApiError& error) {
    reply(res, {{"error", {{"code", error.code}, {"message", error.what()}}}}, error.status);
  }
}
void no_query(const httplib::Request& req) {
  if (!req.params.empty()) throw ApiError(400, "INVALID_REQUEST", "This route takes no query parameters.");
}
std::string month_query(const httplib::Request& req) {
  if (req.params.size() != 1 || !req.has_param("month")) throw ApiError(400, "INVALID_REQUEST", "Supply one month query parameter.");
  const auto month = req.get_param_value("month"); validate_month(month); return month;
}

}
void configure_server(httplib::Server& server, Database& db, Options options) {
  server.set_default_headers({{"Cache-Control", "no-store"}});
  server.set_payload_max_length(64 * 1024);
  server.Get("/health", [](const auto&, auto& res) { reply(res, {{"ok", true}}); });
  server.Get("/api/state", [&db](const auto&, auto& res) { reply(res, app_state(db.read())); });
  server.Post("/api/onboarding", [&db](const auto& req, auto& res) { mutate(db, Action::onboard, req, res); });
  server.Put("/api/letter", [&db](const auto& req, auto& res) { mutate(db, Action::letter, req, res); });
  server.Post("/api/decisions", [&db](const auto& req, auto& res) { mutate(db, Action::decision, req, res); });
  server.Post("/api/savings", [&db](const auto& req, auto& res) { mutate(db, Action::savings, req, res); });
  server.Post("/api/feed", [&db](const auto& req, auto& res) { mutate(db, Action::feed, req, res); });
  server.Post("/api/quests/complete", [&db](const auto& req, auto& res) { mutate(db, Action::quest, req, res); });
  server.Put("/api/preferences", [&db](const auto& req, auto& res) { mutate(db, Action::preferences, req, res); });
  server.Get("/api/budgets", [&db](const auto& req, auto& res) { reply(res, budget_summary(db.read(), month_query(req), local_day())); });
  server.Put("/api/budgets", [&db](const auto& req, auto& res) { mutate(db, Action::budget, req, res); });
  server.Get("/api/transactions", [&db](const auto& req, auto& res) { reply(res, {{"transactions", transactions_for(db.read(), month_query(req))}}); });
  server.Post("/api/transactions", [&db](const auto& req, auto& res) { mutate(db, Action::transaction, req, res); });
  server.Get("/api/insights", [&db](const auto& req, auto& res) { no_query(req); reply(res, {{"insights", spending_insights(db.read())}}); });
  server.Get("/api/reflections/due", [&db](const auto& req, auto& res) { no_query(req); reply(res, {{"transactions", due_reflections(db.read())}}); });
  server.Post("/api/reflections", [&db](const auto& req, auto& res) { mutate(db, Action::reflection, req, res); });
  server.Get("/api/lessons", [&db](const auto& req, auto& res) { no_query(req); reply(res, {{"lessons", lessons(db.read())}}); });
  server.Post("/api/lessons/answer", [&db](const auto& req, auto& res) { mutate(db, Action::lesson, req, res); });
  server.Get("/api/reports/today", [&db](const auto& req, auto& res) { no_query(req); reply(res, daily_report(db.read(), local_day())); });
  server.Post("/api/check-ins", [&db](const auto& req, auto& res) { mutate(db, Action::check_in, req, res); });
  if (options.demo_mode) {
    server.Post("/api/demo/seed", [&db](const auto& req, auto& res) { mutate(db, Action::seed, req, res); });
    server.Post("/api/demo/reset", [&db](const auto& req, auto& res) { mutate(db, Action::reset, req, res); });
  }
  if (options.device_api) {
    server.Get("/api/device/state", [&db](const auto&, auto& res) { reply(res, device_state(db.read())); });
    server.Post("/api/device/gesture", [&db](const auto& req, auto& res) { mutate(db, Action::gesture, req, res); });
  }
  server.set_error_handler([](const auto&, auto& res) {
    if (res.body.empty()) {
      const bool not_found = res.status == 404 || res.status == 405;
      reply(res, {{"error", {{"code", not_found ? "NOT_FOUND" : "INVALID_REQUEST"},
        {"message", not_found ? "Route not found." : "Invalid or oversized request."}}}}, not_found ? 404 : 400);
    }
  });
  server.set_exception_handler([](const auto&, auto& res, std::exception_ptr exception) {
    try { std::rethrow_exception(exception); }
    catch (const ApiError& error) {
      reply(res, {{"error", {{"code", error.code}, {"message", error.what()}}}}, error.status);
    } catch (...) {
      reply(res, {{"error", {{"code", "INTERNAL_ERROR"}, {"message", "Unable to save Mochi. Retry with the same request ID."}}}}, 500);
    }
  });
}
}
