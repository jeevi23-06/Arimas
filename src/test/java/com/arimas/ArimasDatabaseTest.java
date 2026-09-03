package com.arimas;

import com.arimas.memtable.AVLTree;
import com.arimas.model.User;
import com.arimas.storage.Database;
import com.arimas.storage.FileStorage;
import com.arimas.storage.Page;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class ArimasDatabaseTest {

    private static final String TEST_DB_FILE = "test_arimas.db";

    @BeforeEach
    @AfterEach
    public void cleanup() {
        File file = new File(TEST_DB_FILE);
        if (file.exists()) {
            file.delete();
        }
        File tmp = new File(TEST_DB_FILE + ".tmp");
        if (tmp.exists()) {
            tmp.delete();
        }
    }

    @Test
    public void testUserModelSerialization() {
        User user = new User(1L, "Ada Lovelace", "ada@arimas.io", "Computing", 36, 150000.0);
        String textRecord = user.toTextRecord();
        assertEquals("1|Ada Lovelace|ada@arimas.io|Computing|36|150000.00", textRecord);

        User parsed = User.fromTextRecord(textRecord);
        assertNotNull(parsed);
        assertEquals(user.getId(), parsed.getId());
        assertEquals(user.getName(), parsed.getName());
        assertEquals(user.getEmail(), parsed.getEmail());
        assertEquals(user.getDepartment(), parsed.getDepartment());
        assertEquals(user.getAge(), parsed.getAge());
        assertEquals(user.getSalary(), parsed.getSalary());
    }

    @Test
    public void testAVLTreeMemTableBalanceAndOrdering() {
        AVLTree tree = new AVLTree();
        tree.insert(50L, new User(50L, "User 50", "u50@a.io", "Eng", 30, 90000));
        tree.insert(20L, new User(20L, "User 20", "u20@a.io", "Eng", 28, 85000));
        tree.insert(70L, new User(70L, "User 70", "u70@a.io", "Eng", 35, 95000));
        tree.insert(10L, new User(10L, "User 10", "u10@a.io", "Eng", 25, 80000));
        tree.insert(30L, new User(30L, "User 30", "u30@a.io", "Eng", 29, 87000));

        assertEquals(5, tree.size());
        assertNotNull(tree.search(30L));
        assertNull(tree.search(999L));

        // In-order traversal must be strictly ascending by ID
        List<User> sorted = tree.inOrderTraversal();
        assertEquals(5, sorted.size());
        assertEquals(10L, sorted.get(0).getId());
        assertEquals(20L, sorted.get(1).getId());
        assertEquals(30L, sorted.get(2).getId());
        assertEquals(50L, sorted.get(3).getId());
        assertEquals(70L, sorted.get(4).getId());

        // Test deletion with AVL rebalancing
        assertTrue(tree.delete(20L));
        assertEquals(4, tree.size());
        assertNull(tree.search(20L));
    }

    @Test
    public void testPageLogicalBlockCapacity() {
        Page page = new Page(1, 2);
        assertTrue(page.isEmpty());
        assertFalse(page.isFull());

        User u1 = new User(1L, "User 1", "u1@a.io", "Dev", 24, 70000);
        User u2 = new User(2L, "User 2", "u2@a.io", "Dev", 26, 75000);
        User u3 = new User(3L, "User 3", "u3@a.io", "Dev", 28, 80000);

        assertTrue(page.addRecord(u1));
        assertTrue(page.addRecord(u2));
        assertTrue(page.isFull());

        // Capacity bound enforcement
        assertFalse(page.addRecord(u3));
        assertEquals(2, page.getRecordCount());
        assertTrue(page.isDirty());

        // Remove record
        assertTrue(page.removeRecord(1L));
        assertEquals(1, page.getRecordCount());
        assertFalse(page.isFull());
    }

    @Test
    public void testFileStoragePersistence() throws IOException {
        FileStorage storage = new FileStorage(TEST_DB_FILE);
        User u1 = new User(10L, "Dev A", "a@a.io", "Ops", 31, 95000);
        User u2 = new User(20L, "Dev B", "b@a.io", "Ops", 33, 98000);

        storage.saveToFile(List.of(u1, u2), TEST_DB_FILE);

        List<User> loaded = storage.loadFromFile(TEST_DB_FILE);
        assertEquals(2, loaded.size());
        assertEquals(10L, loaded.get(0).getId());
        assertEquals(20L, loaded.get(1).getId());
    }

    @Test
    public void testDatabaseCrudOperations() throws IOException {
        Database db = new Database(TEST_DB_FILE, 2, 3);

        User u1 = new User(101L, "User 101", "u101@a.io", "Eng", 30, 90000);
        User u2 = new User(102L, "User 102", "u102@a.io", "Eng", 31, 91000);
        User u3 = new User(103L, "User 103", "u103@a.io", "Eng", 32, 92000);

        // Insert
        assertTrue(db.insert(u1));
        assertTrue(db.insert(u2));
        assertFalse(db.insert(u1)); // Duplicate

        // Find
        Optional<User> found = db.findById(101L);
        assertTrue(found.isPresent());
        assertEquals("User 101", found.get().getName());

        // Update
        User updated = new User(101L, "User 101 Updated", "u101@a.io", "Leadership", 31, 110000);
        assertTrue(db.update(updated));
        assertEquals("User 101 Updated", db.findById(101L).get().getName());

        // Trigger MemTable flush to Pages
        assertTrue(db.insert(u3)); // Hits threshold of 3, triggers auto-flush to Pages
        assertEquals(0, db.getMemTable().size()); // Cleared after flush
        assertFalse(db.getPages().isEmpty());

        // Persist & restore
        db.persist();
        Database restoredDb = new Database(TEST_DB_FILE, 2, 3);
        restoredDb.load();
        assertEquals(3, restoredDb.getTotalRecordCount());
        assertTrue(restoredDb.findById(102L).isPresent());

        // Delete
        assertTrue(db.delete(101L));
        assertFalse(db.findById(101L).isPresent());
    }
}
