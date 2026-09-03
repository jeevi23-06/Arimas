package com.arimas.storage;

import com.arimas.model.User;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

/**
 * Handles persistent serialization and deserialization of records and logical Page blocks
 * to and from local text storage files for the ARIMAS database.
 */
public class FileStorage {

    private final String defaultFilePath;

    public FileStorage() {
        this("arimas_data.db");
    }

    public FileStorage(String defaultFilePath) {
        this.defaultFilePath = defaultFilePath;
    }

    public String getDefaultFilePath() {
        return defaultFilePath;
    }

    /**
     * Atomically writes a full list of User records to a text file.
     */
    public synchronized void saveToFile(List<User> records, String filePath) throws IOException {
        String targetPath = (filePath != null && !filePath.trim().isEmpty()) ? filePath : defaultFilePath;
        File targetFile = new File(targetPath);
        File parentDir = targetFile.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }

        File tempFile = new File(targetPath + ".tmp");

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile))) {
            writer.write("# ARIMAS DATABASE STORAGE FILE");
            writer.newLine();
            writer.write("# SCHEMA: id|name|email|department|age|salary");
            writer.newLine();
            writer.write("# RECORD_COUNT=" + records.size());
            writer.newLine();

            for (User user : records) {
                if (user != null) {
                    writer.write(user.toTextRecord());
                    writer.newLine();
                }
            }
            writer.flush();
        }

        // Atomic swap
        Files.move(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    /**
     * Appends an individual record to the end of the text file (Write-Ahead Logging / log structure).
     */
    public synchronized void appendToFile(User record, String filePath) throws IOException {
        if (record == null) return;
        String targetPath = (filePath != null && !filePath.trim().isEmpty()) ? filePath : defaultFilePath;
        File file = new File(targetPath);
        boolean exists = file.exists();

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(targetPath, true))) {
            if (!exists) {
                writer.write("# ARIMAS DATABASE STORAGE FILE");
                writer.newLine();
                writer.write("# SCHEMA: id|name|email|department|age|salary");
                writer.newLine();
            }
            writer.write(record.toTextRecord());
            writer.newLine();
            writer.flush();
        }
    }

    /**
     * Reads all User records from the specified text file.
     */
    public synchronized List<User> loadFromFile(String filePath) throws IOException {
        String targetPath = (filePath != null && !filePath.trim().isEmpty()) ? filePath : defaultFilePath;
        File file = new File(targetPath);
        List<User> records = new ArrayList<>();

        if (!file.exists()) {
            return records;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                try {
                    User user = User.fromTextRecord(line);
                    if (user != null) {
                        records.add(user);
                    }
                } catch (IllegalArgumentException ex) {
                    System.err.println("Skipping corrupted record line: " + line);
                }
            }
        }
        return records;
    }

    /**
     * Persists structured Page logical blocks into the text file.
     */
    public synchronized void savePagesToFile(List<Page> pages, String filePath) throws IOException {
        String targetPath = (filePath != null && !filePath.trim().isEmpty()) ? filePath : defaultFilePath;
        File targetFile = new File(targetPath);
        File tempFile = new File(targetPath + ".tmp");

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile))) {
            writer.write("# ARIMAS DATABASE PAGE-SEGMENTED STORAGE");
            writer.newLine();
            writer.write("# TOTAL_PAGES=" + pages.size());
            writer.newLine();

            for (Page page : pages) {
                writer.write(String.format("=== PAGE_HEADER|ID:%d|CAPACITY:%d|COUNT:%d ===",
                        page.getPageId(), page.getCapacity(), page.getRecordCount()));
                writer.newLine();

                for (User u : page.getRecords()) {
                    writer.write(u.toTextRecord());
                    writer.newLine();
                }
                writer.write("=== PAGE_END ===");
                writer.newLine();
                page.setDirty(false);
            }
            writer.flush();
        }

        Files.move(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    /**
     * Loads structured Page blocks from the text file.
     */
    public synchronized List<Page> loadPagesFromFile(String filePath, int defaultPageCapacity) throws IOException {
        String targetPath = (filePath != null && !filePath.trim().isEmpty()) ? filePath : defaultFilePath;
        File file = new File(targetPath);
        List<Page> pages = new ArrayList<>();

        if (!file.exists()) {
            return pages;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            Page currentPage = null;

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                if (line.startsWith("=== PAGE_HEADER")) {
                    String[] tokens = line.replace("===", "").trim().split("\\|");
                    int pageId = pages.size();
                    int cap = defaultPageCapacity;
                    for (String token : tokens) {
                        if (token.startsWith("ID:")) {
                            pageId = Integer.parseInt(token.substring(3));
                        } else if (token.startsWith("CAPACITY:")) {
                            cap = Integer.parseInt(token.substring(9));
                        }
                    }
                    currentPage = new Page(pageId, cap);
                } else if (line.equals("=== PAGE_END ===")) {
                    if (currentPage != null) {
                        currentPage.setDirty(false);
                        pages.add(currentPage);
                        currentPage = null;
                    }
                } else if (currentPage != null) {
                    User user = User.fromTextRecord(line);
                    if (user != null) {
                        currentPage.addRecord(user);
                    }
                }
            }
        }
        return pages;
    }
}
