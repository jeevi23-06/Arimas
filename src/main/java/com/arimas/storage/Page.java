package com.arimas.storage;

import com.arimas.model.User;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Simulates a fixed-size logical block (Page) containing a bounded number of User records.
 * Acts as the fundamental unit of disk I/O and buffer pool caching in the ARIMAS database.
 */
public class Page implements Serializable {
    private static final long serialVersionUID = 1L;

    public static final int DEFAULT_CAPACITY = 4;

    private final int pageId;
    private final int capacity;
    private final List<User> records;
    private boolean isDirty;
    private int pinCount;

    public Page(int pageId) {
        this(pageId, DEFAULT_CAPACITY);
    }

    public Page(int pageId, int capacity) {
        if (capacity <= 0) {
            throw new IllegalArgumentException("Page capacity must be positive");
        }
        this.pageId = pageId;
        this.capacity = capacity;
        this.records = new ArrayList<>(capacity);
        this.isDirty = false;
        this.pinCount = 0;
    }

    public synchronized boolean isFull() {
        return records.size() >= capacity;
    }

    public synchronized boolean isEmpty() {
        return records.isEmpty();
    }

    public synchronized boolean addRecord(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User record cannot be null");
        }
        if (isFull()) {
            return false;
        }
        // Avoid duplicate ID in the same page
        for (int i = 0; i < records.size(); i++) {
            if (records.get(i).getId().equals(user.getId())) {
                records.set(i, user);
                this.isDirty = true;
                return true;
            }
        }
        records.add(user);
        this.isDirty = true;
        return true;
    }

    public synchronized Optional<User> getRecord(Long id) {
        if (id == null) return Optional.empty();
        return records.stream()
                .filter(u -> u.getId().equals(id))
                .findFirst();
    }

    public synchronized boolean updateRecord(User updatedUser) {
        if (updatedUser == null || updatedUser.getId() == null) {
            return false;
        }
        for (int i = 0; i < records.size(); i++) {
            if (records.get(i).getId().equals(updatedUser.getId())) {
                records.set(i, updatedUser);
                this.isDirty = true;
                return true;
            }
        }
        return false;
    }

    public synchronized boolean removeRecord(Long id) {
        if (id == null) return false;
        boolean removed = records.removeIf(u -> u.getId().equals(id));
        if (removed) {
            this.isDirty = true;
        }
        return removed;
    }

    public synchronized int getPageId() {
        return pageId;
    }

    public synchronized int getCapacity() {
        return capacity;
    }

    public synchronized int getRecordCount() {
        return records.size();
    }

    public synchronized int getFreeSlots() {
        return capacity - records.size();
    }

    public synchronized List<User> getRecords() {
        return Collections.unmodifiableList(new ArrayList<>(records));
    }

    public synchronized boolean isDirty() {
        return isDirty;
    }

    public synchronized void setDirty(boolean dirty) {
        this.isDirty = dirty;
    }

    public synchronized void pin() {
        this.pinCount++;
    }

    public synchronized void unpin() {
        if (this.pinCount > 0) {
            this.pinCount--;
        }
    }

    public synchronized int getPinCount() {
        return pinCount;
    }

    public synchronized void clear() {
        records.clear();
        this.isDirty = true;
    }

    @Override
    public String toString() {
        return "Page{" +
                "pageId=" + pageId +
                ", capacity=" + capacity +
                ", recordCount=" + records.size() +
                ", isDirty=" + isDirty +
                '}';
    }
}
