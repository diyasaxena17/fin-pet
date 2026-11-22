#pragma once
#include "database.hpp"
#include <httplib.h>

namespace mochi {
struct Options { bool demo_mode = false; bool device_api = false; bool sandbox_replay = false; };
void configure_server(httplib::Server& server, Database& db, Options options = {});
}
