package com.arimas.controller;

import com.arimas.cluster.ClusterManager;
import com.arimas.cluster.DatabaseNode;
import com.arimas.cluster.RaftState;
import com.arimas.model.User;
import com.arimas.storage.Database;
import com.arimas.query.ExecutionPlan;
import com.arimas.query.Parser;
import com.arimas.query.QueryAST;
import com.arimas.query.QueryOptimizer;
import com.arimas.query.Condition;
import com.arimas.execution.ExecutionEngine;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DatabaseController {

    private final Database database;
    private final Parser parser;
    private final QueryOptimizer optimizer;
    private final ExecutionEngine executionEngine;
    private final ClusterManager clusterManager;

    @Autowired
    public DatabaseController(Database database, ClusterManager clusterManager) {
        this.database = database;
        this.clusterManager = clusterManager;
        this.parser = new Parser();
        this.optimizer = new QueryOptimizer();
        this.executionEngine = new ExecutionEngine();
    }

    static class QueryRequest {
        public String query;
    }

    @PostMapping("/query")
    public ResponseEntity<?> executeQuery(@RequestBody QueryRequest request) {
        try {
            QueryAST ast = parser.parse(request.query);

            if ("INSERT".equalsIgnoreCase(ast.operation())) {
                return handleInsert(ast);
            } else if ("SELECT".equalsIgnoreCase(ast.operation())) {
                return handleSelect(ast);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Unsupported operation: " + ast.operation()));
            }

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private ResponseEntity<?> handleInsert(QueryAST ast) {
        Long id = null;
        String name = "";
        String email = "";
        String department = "";
        int age = 0;
        double salary = 0.0;

        if (ast.conditions() != null) {
            for (Condition cond : ast.conditions()) {
                switch (cond.column().toLowerCase()) {
                    case "id": id = Long.parseLong(cond.value()); break;
                    case "name": name = cond.value(); break;
                    case "email": email = cond.value(); break;
                    case "department": department = cond.value(); break;
                    case "age": age = Integer.parseInt(cond.value()); break;
                    case "salary": salary = Double.parseDouble(cond.value()); break;
                }
            }
        }

        if (id == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Primary key 'id' is required for INSERT"));
        }

        User newUser = new User(id, name, email, department, age, salary);
        boolean success = database.insert(newUser);

        if (success) {
            return ResponseEntity.ok(Map.of(
                "executionPlan", "INSERT_INTO_MEMTABLE",
                "ast", ast,
                "results", List.of(Map.of("status", "Success", "message", "User inserted successfully", "id", id))
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Insert failed: User with ID " + id + " already exists."));
        }
    }

    private ResponseEntity<?> handleSelect(QueryAST ast) {
        ExecutionPlan plan = optimizer.optimize(ast);
        List<User> records = new ArrayList<>();

        if (plan.scanType() == ExecutionPlan.ScanType.BTREE_INDEX_SCAN) {
            Long searchId = null;
            for (Condition cond : ast.conditions()) {
                if (cond.column().equalsIgnoreCase("id")) {
                    searchId = Long.parseLong(cond.value());
                    break;
                }
            }
            Optional<User> userOpt = database.findById(searchId);
            userOpt.ifPresent(records::add);

        } else {
            List<User> allUsers = database.findAll();
            for (User u : allUsers) {
                if (matchesConditions(u, ast.conditions())) {
                    records.add(u);
                }
            }
        }

        if (ast.orderBy() != null && !ast.orderBy().isEmpty()) {
            records = executionEngine.mergeSort(records, u -> extractSortKey(u, ast.orderBy()));
        }

        if (ast.limit() != null && records.size() > ast.limit()) {
            records = records.subList(0, ast.limit());
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (User u : records) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId());
            row.put("name", u.getName());
            row.put("email", u.getEmail());
            row.put("department", u.getDepartment());
            row.put("age", u.getAge());
            row.put("salary", u.getSalary());
            results.add(row);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("executionPlan", plan.scanType().name());
        response.put("ast", ast);
        response.put("results", results);
        
        return ResponseEntity.ok(response);
    }

    private boolean matchesConditions(User user, List<Condition> conditions) {
        if (conditions == null || conditions.isEmpty()) return true;
        for (Condition cond : conditions) {
            String col = cond.column().toLowerCase();
            String val = cond.value();
            boolean matched = false;
            switch (col) {
                case "id": matched = user.getId().equals(Long.parseLong(val)); break;
                case "name": matched = user.getName().equalsIgnoreCase(val); break;
                case "email": matched = user.getEmail().equalsIgnoreCase(val); break;
                case "department": matched = user.getDepartment().equalsIgnoreCase(val); break;
                case "age": matched = user.getAge() == Integer.parseInt(val); break;
            }
            if (!matched) return false;
        }
        return true;
    }

    @SuppressWarnings("rawtypes")
    private Comparable extractSortKey(User user, String column) {
        switch (column.toLowerCase()) {
            case "id": return user.getId();
            case "name": return user.getName();
            case "age": return user.getAge();
            case "salary": return user.getSalary();
            default: return user.getId();
        }
    }

    @GetMapping("/cluster/status")
    public ResponseEntity<?> getClusterStatus() {
        Map<String, Object> status = new HashMap<>();
        
        List<DatabaseNode> nodesList = clusterManager.getNodes();
        int maxTerm = 0;
        String leaderId = "NO_LEADER";
        
        List<Map<String, String>> nodesJson = new ArrayList<>();
        for (DatabaseNode node : nodesList) {
            if (node.getCurrentTerm() > maxTerm) {
                maxTerm = node.getCurrentTerm();
            }
            if (node.getState() == RaftState.LEADER) {
                leaderId = node.getNodeId();
            }
            
            nodesJson.add(Map.of(
                "id", node.getNodeId(),
                "state", node.getState().name(),
                "health", "UP"
            ));
        }
        
        status.put("leader", leaderId);
        status.put("term", maxTerm);
        status.put("nodes", nodesJson);
        
        return ResponseEntity.ok(status);
    }
}
