#include "crow.h"
#include <algorithm>
#include <vector>
#include <sstream>

using namespace std;

static constexpr const char* kAllowedOrigin = "http://localhost:3000";

void add_cors_headers(crow::response& res) {
    res.add_header("Access-Control-Allow-Origin", kAllowedOrigin);
    res.add_header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.add_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.add_header("Access-Control-Max-Age", "86400");
    res.add_header("Vary", "Origin");
}

struct CorsMiddleware {
    struct context {};

    void before_handle(crow::request&, crow::response&, context&) const {}

    void after_handle(crow::request&, crow::response& res, context&) const {
        add_cors_headers(res);
    }
};

crow::response make_cors_text_response(int code, const string& body) {
    crow::response res(code, body);
    return res;
}

crow::response make_cors_json_response(const crow::json::wvalue& body) {
    crow::response res(body.dump());
    res.set_header("Content-Type", "application/json");
    return res;
}

vector<int> get_circuit(vector<vector<int>> &adj) {
    // need to check that adj is strongly connected and outdegree=indegree for all v

    int n = adj.size();

    // check adj is not trivial
    if (n == 0) {
        return {};
    }

    // hold current path
    vector<int> currPath;
    currPath.push_back(0); // can start from any vertex since circuit exists

    vector<int> circuit; // final circuit

    while (currPath.size() > 0) {
        int currNode = currPath[currPath.size() - 1];

        // check there is a next node
        if (adj[currNode].size() > 0) {
            // get next node
            int next = adj[currNode].back();
            adj[currNode].pop_back();

            // add to currPath
            currPath.push_back(next);
        } else {
            // else populate circuit
            circuit.push_back(currPath.back());
            currPath.pop_back();
        }
    }

    reverse(circuit.begin(), circuit.end());
    
    // return circuit
    return circuit;
}

int main()
{
    crow::App<CorsMiddleware> app;

    CROW_ROUTE(app, "/").methods(crow::HTTPMethod::POST)(
        [](const crow::request& req){
        auto payload = crow::json::load(req.body);
        if (!payload || payload.t() != crow::json::type::List) {
            return make_cors_text_response(400, "Expected JSON array of arrays");
        }

        vector<vector<int>> adj;
        adj.reserve(payload.size());

        for (const auto& row : payload) {
            if (row.t() != crow::json::type::List) {
                return make_cors_text_response(400, "Each row must be a JSON array");
            }

            vector<int> edges;
            edges.reserve(row.size());
            for (const auto& value : row) {
                if (value.t() != crow::json::type::Number) {
                    return make_cors_text_response(400, "Adjacency values must be numbers");
                }
                edges.push_back(static_cast<int>(value.i()));
            }
            adj.push_back(std::move(edges));
        }

        vector<int> ans = get_circuit(adj);
        crow::json::wvalue result;
        crow::json::wvalue::list circuitJson;
        for (int v : ans) {
            circuitJson.emplace_back(v);
        }
        result["circuit"] = std::move(circuitJson);

        return make_cors_json_response(result);
    });

    app.port(18080).multithreaded().run();
}