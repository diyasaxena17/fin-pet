#pragma once
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <string>

namespace mochi {
using Json = nlohmann::json;
struct ApiError : std::runtime_error {
  int status;
  std::string code;
  ApiError(int status, std::string code, const std::string& message)
      : std::runtime_error(message), status(status), code(std::move(code)) {}
};
Json empty_state();
void validate_stored_state(const Json& state);
Json app_state(const Json& state, const std::string& day = "");
}
