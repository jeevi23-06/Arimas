package com.arimas.storage;

import com.arimas.memtable.AVLTree;
import com.arimas.model.User;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Core in-memory Database engine for the ARIMAS prototype.
 * Coordinates the AVLTree MemTable, Page-structured logical storage blocks,
 * and FileStorage durability.
 */
public class Database {

    private final AVLTree memTable;
    private final List<Page> pages;
    private final Map<Long, Integer> pageDirectory; // User ID -> Page ID
    private final FileStorage fileStorage;
    private final String persistencePath;
    private final int pageCapacity;
    private final int memTableFlushThreshold;
    private final ReentrantReadWriteLock rwLock;

    public Database() {
        this("arimas_data.db", Page.DEFAULT_CAPACITY, 5);
    }

    public Database(String persistencePath, int pageCapacity, int memTableFlushThreshold) {
        this.memTable = new AVLTree();
        this.pages = new ArrayList<>();
        this.pageDirectory = new ConcurrentHashMap<>();
        this.fileStorage = new FileStorage(persistencePath);
        this.persistencePath = persistencePath;
        this.pageCapacity = pageCapacity;
        this.memTableFlushThreshold = memTableFlushThreshold;
        this.rwLock = new ReentrantReadWriteLock();
    }

    /**
     * Inserts a user record into the in-memory database.
     * Records enter the AVLTree MemTable first. When the MemTable threshold is met,
     * it flushes records into Page storage blocks.
     */
    public boolean insert(User user) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User and User ID must not be null");
        }

        rwLock.writeLock().lock();
        try {
            // Check if record already exists across MemTable or Pages
            if (findByIdInternal(user.getId()).isPresent()) {
                return false; // Duplicate key
            }

            // Insert into AVLTree MemTable
            memTable.insert(user.getId(), user);

            // Trigger flush if threshold exceeded
            if (memTable.isThresholdReached(memTableFlushThreshold)) {
                flushMemTableToPagesInternal();
            }

            return true;
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    /**
     * Finds a user by ID.
     * Checks the AVLTree MemTable first (hot write cache), then queries the Page directory.
     */
    public Optional<User> findById(Long id) {
        if (id == null) return Optional.empty();

        rwLock.readLock().lock();
        try {
            return findByIdInternal(id);
        } finally {
            rwLock.readLock().unlock();
        }
    }

    private Optional<User> findByIdInternal(Long id) {
        // 1. MemTable Lookup (O(log N))
        User memUser = memTable.search(id);
        if (memUser != null) {
            return Optional.of(memUser);
        }

        // 2. Page Directory Lookup
        Integer pageId = pageDirectory.get(id);
        if (pageId != null) {
            for (Page p : pages) {
                if (p.getPageId() == pageId) {
                    return p.getRecord(id);
                }
            }
        }

        // 3. Fallback linear search across pages if directory miss
        for (Page p : pages) {
            Optional<User> u = p.getRecord(id);
            if (u.isPresent()) {
                pageDirectory.put(id, p.getPageId());
                return u;
            }
        }

        return Optional.empty();
    }

    /**
     * Updates an existing user record.
     */
    public boolean update(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }

        rwLock.writeLock().lock();
        try {
            // If in MemTable, update directly
            if (memTable.search(user.getId()) != null) {
                memTable.insert(user.getId(), user);
                return true;
            }

            // If in Page storage
            Integer pageId = pageDirectory.get(user.getId());
            if (pageId != null) {
                for (Page p : pages) {
                    if (p.getPageId() == pageId) {
                        return p.updateRecord(user);
                    }
                }
            }

            for (Page p : pages) {
                if (p.updateRecord(user)) {
                    pageDirectory.put(user.getId(), p.getPageId());
                    return true;
                }
            }

            return false; // Record not found
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    /**
     * Deletes a user by ID.
     */
    public boolean delete(Long id) {
        if (id == null) return false;

        rwLock.writeLock().lock();
        try {
            boolean removedFromMem = memTable.delete(id);

            Integer pageId = pageDirectory.remove(id);
            boolean removedFromPage = false;

            if (pageId != null) {
                for (Page p : pages) {
                    if (p.getPageId() == pageId) {
                        removedFromPage = p.removeRecord(id);
                        break;
                    }
                }
            }

            if (!removedFromPage) {
                for (Page p : pages) {
                    if (p.removeRecord(id)) {
                        removedFromPage = true;
                        break;
                    }
                }
            }

            return removedFromMem || removedFromPage;
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    /**
     * Flushes records from the AVLTree MemTable into Page blocks.
     */
    public void flushMemTableToPages() {
        rwLock.writeLock().lock();
        try {
            flushMemTableToPagesInternal();
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    private void flushMemTableToPagesInternal() {
        List<User> sortedRecords = memTable.inOrderTraversal();
        for (User record : sortedRecords) {
            assignRecordToPage(record);
        }
        memTable.clear();
    }

    private void assignRecordToPage(User record) {
        // Find existing page with free space
        for (Page page : pages) {
            if (!page.isFull()) {
                page.addRecord(record);
                pageDirectory.put(record.getId(), page.getPageId());
                return;
            }
        }

        // Allocate a new Page block
        int newPageId = pages.size();
        Page newPage = new Page(newPageId, pageCapacity);
        newPage.addRecord(record);
        pages.add(newPage);
        pageDirectory.put(record.getId(), newPageId);
    }

    /**
     * Persists all database state to the local text file via FileStorage.
     */
    public void persist() throws IOException {
        rwLock.writeLock().lock();
        try {
            // First flush active MemTable into Pages
            flushMemTableToPagesInternal();
            // Serialize Pages to disk
            fileStorage.savePagesToFile(pages, persistencePath);
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    /**
     * Restores database state from local text storage.
     */
    public void load() throws IOException {
        rwLock.writeLock().lock();
        try {
            pages.clear();
            pageDirectory.clear();
            memTable.clear();

            List<Page> loadedPages = fileStorage.loadPagesFromFile(persistencePath, pageCapacity);
            pages.addAll(loadedPages);

            for (Page p : pages) {
                for (User u : p.getRecords()) {
                    pageDirectory.put(u.getId(), p.getPageId());
                }
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public List<User> findAll() {
        rwLock.readLock().lock();
        try {
            Map<Long, User> combined = new LinkedHashMap<>();
            // Pages records
            for (Page p : pages) {
                for (User u : p.getRecords()) {
                    combined.put(u.getId(), u);
                }
            }
            // MemTable records override/append
            for (User u : memTable.inOrderTraversal()) {
                combined.put(u.getId(), u);
            }
            return new ArrayList<>(combined.values());
        } finally {
            rwLock.readLock().unlock();
        }
    }

    public AVLTree getMemTable() {
        return memTable;
    }

    public List<Page> getPages() {
        return Collections.unmodifiableList(pages);
    }

    public int getTotalRecordCount() {
        rwLock.readLock().lock();
        try {
            int count = memTable.size();
            for (Page p : pages) {
                count += p.getRecordCount();
            }
            return count;
        } finally {
            rwLock.readLock().unlock();
        }
    }
}
