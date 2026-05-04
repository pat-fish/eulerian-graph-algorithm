#include "crow.h"
#include <algorithm>
#include <vector>
#include <sstream>

using namespace std;

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
    crow::SimpleApp app;

    CROW_ROUTE(app, "/").methods(crow::HTTPMethod::POST)(
        [](const crow::request& req){
        auto payload = crow::json::load(req.body);
        if (!payload || payload.t() != crow::json::type::List) {
            return crow::response(400, "Expected JSON array of arrays");
        }

        vector<vector<int>> adj;
        adj.reserve(payload.size());

        for (const auto& row : payload) {
            if (row.t() != crow::json::type::List) {
                return crow::response(400, "Each row must be a JSON array");
            }

            vector<int> edges;
            edges.reserve(row.size());
            for (const auto& value : row) {
                if (value.t() != crow::json::type::Number) {
                    return crow::response(400, "Adjacency values must be numbers");
                }
                edges.push_back(static_cast<int>(value.i()));
            }
            adj.push_back(std::move(edges));
        }

        vector<int> ans = get_circuit(adj);
        ostringstream os;
        os << "[";
        for (size_t i = 0; i < ans.size(); ++i) {
            if (i > 0) {
                os << ", ";
            }
            os << ans[i];
        }
        os << "]";
        return crow::response(os.str());
    });

    app.port(18080).multithreaded().run();
}