#include "app_state.hpp"

namespace mochi {
Json empty_state() { return {{"version", 1}, {"account", nullptr}}; }
void validate_stored_state(const Json& state) {
  if (!state.is_object() || state.size() != 2 || state.at("version") != 1 || !state.contains("account") ||
      !(state.at("account").is_null() || state.at("account").is_object()))
    throw std::runtime_error("Corrupt or incompatible Mochi state");
}
Json app_state(const Json&) { return {{"initialized", false}}; }
}
