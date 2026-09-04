package com.arimas.controller;

import com.arimas.model.User;
import com.arimas.storage.Database;
import com.arimas.storage.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST API controller exposing ARIMAS database storage operations.
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final Database database;

    public UserController(Database database) {
        this.database = database;
    }

    @PostMapping
    public ResponseEntity<?> insert(@RequestBody User user) {
        if (user.getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User ID is required"));
        }
        boolean created = database.insert(user);
        if (!created) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "User with ID " + user.getId() + " already exists"));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> findById(@PathVariable Long id) {
        return database.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found with ID: " + id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        boolean updated = database.update(user);
        if (!updated) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found to update with ID: " + id));
        }
        return ResponseEntity.ok(user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        boolean deleted = database.delete(id);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found to delete with ID: " + id));
        }
        return ResponseEntity.ok(Map.of("message", "User with ID " + id + " deleted successfully"));
    }

    @GetMapping
    public ResponseEntity<List<User>> findAll() {
        return ResponseEntity.ok(database.findAll());
    }

    @PostMapping("/flush")
    public ResponseEntity<?> flushMemTable() {
        database.flushMemTableToPages();
        return ResponseEntity.ok(Map.of("message", "MemTable flushed into logical Page blocks successfully"));
    }

    @PostMapping("/persist")
    public ResponseEntity<?> persist() {
        try {
            database.persist();
            return ResponseEntity.ok(Map.of("message", "Database successfully persisted to text storage file"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Persistence failed: " + e.getMessage()));
        }
    }

    @PostMapping("/load")
    public ResponseEntity<?> load() {
        try {
            database.load();
            return ResponseEntity.ok(Map.of("message", "Database successfully restored from text storage file"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Disk restore failed: " + e.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRecords", database.getTotalRecordCount());
        stats.put("memTableSize", database.getMemTable().size());
        stats.put("pageCount", database.getPages().size());
        stats.put("pages", database.getPages());
        return ResponseEntity.ok(stats);
    }
}
