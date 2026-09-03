import React, { useState } from 'react';
import {
  Database as DatabaseIcon,
  HardDrive,
  Layers,
  GitBranch,
  FileText,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Copy,
  Terminal,
  Server,
  FileCode2,
  Download
} from 'lucide-react';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  department: string;
  age: number;
  salary: number;
}

interface PageBlock {
  pageId: number;
  capacity: number;
  records: UserRecord[];
  isDirty: boolean;
}

interface AVLNode {
  key: number;
  value: UserRecord;
  height: number;
  left: AVLNode | null;
  right: AVLNode | null;
}

const INITIAL_USERS: UserRecord[] = [
  { id: 101, name: 'Alice Johnson', email: 'alice@arimas.io', department: 'Storage Core', age: 32, salary: 125000 },
  { id: 102, name: 'Bob Smith', email: 'bob@arimas.io', department: 'Distributed Consensus', age: 29, salary: 118000 },
  { id: 103, name: 'Carol White', email: 'carol@arimas.io', department: 'Query Engine', age: 35, salary: 142000 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'report'>('simulator');
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('AVLTree.java');
  const [copied, setCopied] = useState<boolean>(false);

  // Database State
  const [memTable, setMemTable] = useState<UserRecord[]>(INITIAL_USERS);
  const [pages, setPages] = useState<PageBlock[]>([]);
  const [diskFileContent, setDiskFileContent] = useState<string>(
    '# ARIMAS DATABASE STORAGE FILE\n# SCHEMA: id|name|email|department|age|salary\n# RECORD_COUNT=0\n'
  );
  const [lastPersistedAt, setLastPersistedAt] = useState<string>('Not yet persisted');

  // Input fields for insertion
  const [newId, setNewId] = useState<number>(104);
  const [newName, setNewName] = useState<string>('David Vance');
  const [newEmail, setNewEmail] = useState<string>('david@arimas.io');
  const [newDept, setNewDept] = useState<string>('Storage Core');
  const [newAge, setNewAge] = useState<number>(31);
  const [newSalary, setNewSalary] = useState<number>(120000);

  // Search & Status
  const [searchId, setSearchId] = useState<string>('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([
    'ARIMAS Storage Engine Phase 1 initialized.',
    'Seeded 3 user records into AVLTree MemTable.',
  ]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setStatusLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName.trim()) return;

    // Check duplicate
    const existsInMem = memTable.some(u => u.id === Number(newId));
    const existsInPage = pages.some(p => p.records.some(u => u.id === Number(newId)));

    if (existsInMem || existsInPage) {
      addLog(`ERR: Duplicate key rejected for user ID ${newId}`);
      return;
    }

    const newUser: UserRecord = {
      id: Number(newId),
      name: newName.trim(),
      email: newEmail.trim(),
      department: newDept.trim(),
      age: Number(newAge),
      salary: Number(newSalary),
    };

    // Insert into MemTable (sorted by ID like AVL)
    const updatedMem = [...memTable, newUser].sort((a, b) => a.id - b.id);

    if (updatedMem.length >= 5) {
      // Auto flush to Pages at threshold 5
      flushMemTableInternal(updatedMem);
      addLog(`MemTable reached threshold (5 records) -> Auto-flushed to Page blocks.`);
    } else {
      setMemTable(updatedMem);
      addLog(`Inserted record ID ${newUser.id} (${newUser.name}) into MemTable.`);
    }

    setNewId(prev => prev + 1);
  };

  const flushMemTableInternal = (recordsToFlush: UserRecord[]) => {
    const newPages = [...pages];

    for (const record of recordsToFlush) {
      let placed = false;
      for (const page of newPages) {
        if (page.records.length < page.capacity) {
          page.records.push(record);
          page.isDirty = true;
          placed = true;
          break;
        }
      }
      if (!placed) {
        newPages.push({
          pageId: newPages.length,
          capacity: 4,
          records: [record],
          isDirty: true,
        });
      }
    }

    setPages(newPages);
    setMemTable([]);
  };

  const handleManualFlush = () => {
    if (memTable.length === 0) {
      addLog('MemTable is already empty. Nothing to flush.');
      return;
    }
    const count = memTable.length;
    flushMemTableInternal(memTable);
    addLog(`Manually flushed ${count} records from AVLTree MemTable into Page blocks.`);
  };

  const handleSearch = () => {
    if (!searchId) return;
    const targetId = Number(searchId);

    // 1. Search MemTable
    const inMem = memTable.find(u => u.id === targetId);
    if (inMem) {
      setSearchResult(`Found in MemTable (AVLTree, O(log N)): ${inMem.name} | ${inMem.department} | $${inMem.salary.toLocaleString()}`);
      addLog(`Cache Hit: User ${targetId} resolved in MemTable.`);
      return;
    }

    // 2. Search Pages
    for (const p of pages) {
      const inPage = p.records.find(u => u.id === targetId);
      if (inPage) {
        setSearchResult(`Found in Page #${p.pageId}: ${inPage.name} | ${inPage.department} | $${inPage.salary.toLocaleString()}`);
        addLog(`Page Hit: User ${targetId} found in Page #${p.pageId}.`);
        return;
      }
    }

    setSearchResult(`User with ID ${targetId} not found.`);
    addLog(`Miss: User ${targetId} does not exist.`);
  };

  const handleDelete = (id: number) => {
    let deleted = false;
    // Check MemTable
    if (memTable.some(u => u.id === id)) {
      setMemTable(prev => prev.filter(u => u.id !== id));
      deleted = true;
    }

    // Check Pages
    const updatedPages = pages.map(p => {
      const match = p.records.some(u => u.id === id);
      if (match) {
        deleted = true;
        return {
          ...p,
          records: p.records.filter(u => u.id !== id),
          isDirty: true,
        };
      }
      return p;
    });

    setPages(updatedPages);
    if (deleted) {
      addLog(`Deleted record ID ${id} across storage hierarchy.`);
    } else {
      addLog(`ERR: ID ${id} not found to delete.`);
    }
  };

  const handlePersistToDisk = () => {
    // Collect all records
    const allPages = [...pages];
    if (memTable.length > 0) {
      flushMemTableInternal(memTable);
    }

    const lines: string[] = [
      '# ARIMAS DATABASE PAGE-SEGMENTED STORAGE',
      '# SCHEMA: id|name|email|department|age|salary',
      `# TOTAL_PAGES=${allPages.length}`,
    ];

    allPages.forEach(p => {
      lines.push(`=== PAGE_HEADER|ID:${p.pageId}|CAPACITY:${p.capacity}|COUNT:${p.records.length} ===`);
      p.records.forEach(r => {
        lines.push(`${r.id}|${r.name}|${r.email}|${r.department}|${r.age}|${r.salary.toFixed(2)}`);
      });
      lines.push('=== PAGE_END ===');
    });

    setDiskFileContent(lines.join('\n'));
    setLastPersistedAt(new Date().toLocaleTimeString());
    setPages(prev => prev.map(p => ({ ...p, isDirty: false })));
    addLog(`FileStorage: Persisted database to local disk file (arimas_data.db).`);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeFiles: Record<string, string> = {
    'AVLTree.java': `package com.arimas.memtable;

import com.arimas.model.User;
import java.util.ArrayList;
import java.util.List;

/**
 * Self-balancing AVL Tree MemTable for incoming records.
 */
public class AVLTree {
    public static class Node {
        Long key;
        User value;
        int height = 1;
        Node left, right;
        public Node(Long key, User value) {
            this.key = key;
            this.value = value;
        }
    }

    private Node root;
    private int size = 0;

    public synchronized void insert(Long key, User value) {
        root = insertRec(root, key, value);
    }

    private Node insertRec(Node node, Long key, User value) {
        if (node == null) {
            size++;
            return new Node(key, value);
        }
        if (key < node.key) node.left = insertRec(node.left, key, value);
        else if (key > node.key) node.right = insertRec(node.right, key, value);
        else { node.value = value; return node; }

        node.height = 1 + Math.max(height(node.left), height(node.right));
        return rebalance(node, key);
    }

    public synchronized User search(Long key) {
        Node curr = root;
        while (curr != null) {
            if (key.equals(curr.key)) return curr.value;
            curr = key < curr.key ? curr.left : curr.right;
        }
        return null;
    }

    public synchronized List<User> inOrderTraversal() {
        List<User> list = new ArrayList<>();
        inOrder(root, list);
        return list;
    }

    private void inOrder(Node node, List<User> list) {
        if (node != null) {
            inOrder(node.left, list);
            list.add(node.value);
            inOrder(node.right, list);
        }
    }

    public synchronized void clear() { root = null; size = 0; }
    public synchronized int size() { return size; }
    public synchronized boolean isThresholdReached(int limit) { return size >= limit; }
    private int height(Node n) { return n == null ? 0 : n.height; }
    private int getBalance(Node n) { return n == null ? 0 : height(n.left) - height(n.right); }
    private Node rightRotate(Node y) {
        Node x = y.left; Node t2 = x.right;
        x.right = y; y.left = t2;
        y.height = Math.max(height(y.left), height(y.right)) + 1;
        x.height = Math.max(height(x.left), height(x.right)) + 1;
        return x;
    }
    private Node leftRotate(Node x) {
        Node y = x.right; Node t2 = y.left;
        y.left = x; x.right = t2;
        x.height = Math.max(height(x.left), height(x.right)) + 1;
        y.height = Math.max(height(y.left), height(y.right)) + 1;
        return y;
    }
    private Node rebalance(Node node, Long key) {
        int balance = getBalance(node);
        if (balance > 1 && key < node.left.key) return rightRotate(node);
        if (balance < -1 && key > node.right.key) return leftRotate(node);
        if (balance > 1 && key > node.left.key) { node.left = leftRotate(node.left); return rightRotate(node); }
        if (balance < -1 && key < node.right.key) { node.right = rightRotate(node.right); return leftRotate(node); }
        return node;
    }
}`,
    'Page.java': `package com.arimas.storage;

import com.arimas.model.User;
import java.io.Serializable;
import java.util.*;

/**
 * Simulates a fixed logical block containing a set number of records.
 */
public class Page implements Serializable {
    public static final int DEFAULT_CAPACITY = 4;
    private final int pageId;
    private final int capacity;
    private final List<User> records;
    private boolean isDirty;

    public Page(int pageId, int capacity) {
        this.pageId = pageId;
        this.capacity = capacity;
        this.records = new ArrayList<>(capacity);
        this.isDirty = false;
    }

    public synchronized boolean addRecord(User user) {
        if (isFull()) return false;
        records.add(user);
        this.isDirty = true;
        return true;
    }

    public synchronized Optional<User> getRecord(Long id) {
        return records.stream().filter(u -> u.getId().equals(id)).findFirst();
    }

    public synchronized boolean removeRecord(Long id) {
        boolean removed = records.removeIf(u -> u.getId().equals(id));
        if (removed) isDirty = true;
        return removed;
    }

    public boolean isFull() { return records.size() >= capacity; }
    public boolean isEmpty() { return records.isEmpty(); }
    public int getPageId() { return pageId; }
    public int getCapacity() { return capacity; }
    public int getRecordCount() { return records.size(); }
    public List<User> getRecords() { return Collections.unmodifiableList(records); }
    public boolean isDirty() { return isDirty; }
    public void setDirty(boolean dirty) { this.isDirty = dirty; }
}`,
    'FileStorage.java': `package com.arimas.storage;

import com.arimas.model.User;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * Serializes User records and Page blocks to local text files.
 */
public class FileStorage {
    private final String defaultPath;

    public FileStorage(String defaultPath) {
        this.defaultPath = defaultPath;
    }

    public synchronized void savePagesToFile(List<Page> pages, String path) throws IOException {
        String p = path != null ? path : defaultPath;
        File temp = new File(p + ".tmp");
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(temp))) {
            writer.write("# ARIMAS DATABASE PAGE-SEGMENTED STORAGE\\n");
            writer.write("# TOTAL_PAGES=" + pages.size() + "\\n");
            for (Page page : pages) {
                writer.write(String.format("=== PAGE_HEADER|ID:%d|CAPACITY:%d|COUNT:%d ===\\n",
                        page.getPageId(), page.getCapacity(), page.getRecordCount()));
                for (User u : page.getRecords()) {
                    writer.write(u.toTextRecord() + "\\n");
                }
                writer.write("=== PAGE_END ===\\n");
                page.setDirty(false);
            }
        }
        Files.move(temp.toPath(), Paths.get(p), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    public synchronized List<Page> loadPagesFromFile(String path, int capacity) throws IOException {
        File file = new File(path != null ? path : defaultPath);
        List<Page> pages = new ArrayList<>();
        if (!file.exists()) return pages;

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line; Page cur = null;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.startsWith("=== PAGE_HEADER")) {
                    cur = new Page(pages.size(), capacity);
                } else if (line.equals("=== PAGE_END ===")) {
                    if (cur != null) { pages.add(cur); cur = null; }
                } else if (cur != null && !line.startsWith("#")) {
                    cur.addRecord(User.fromTextRecord(line));
                }
            }
        }
        return pages;
    }
}`,
    'Database.java': `package com.arimas.storage;

import com.arimas.memtable.AVLTree;
import com.arimas.model.User;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * In-memory Database engine coordinating MemTable, Pages, and FileStorage.
 */
public class Database {
    private final AVLTree memTable = new AVLTree();
    private final List<Page> pages = new ArrayList<>();
    private final Map<Long, Integer> directory = new ConcurrentHashMap<>();
    private final FileStorage fileStorage;
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final int pageCapacity;
    private final int memTableLimit;

    public Database(String path, int pageCapacity, int memTableLimit) {
        this.fileStorage = new FileStorage(path);
        this.pageCapacity = pageCapacity;
        this.memTableLimit = memTableLimit;
    }

    public boolean insert(User user) {
        rwLock.writeLock().lock();
        try {
            if (findByIdInternal(user.getId()).isPresent()) return false;
            memTable.insert(user.getId(), user);
            if (memTable.isThresholdReached(memTableLimit)) flushMemTable();
            return true;
        } finally { rwLock.writeLock().unlock(); }
    }

    public Optional<User> findById(Long id) {
        rwLock.readLock().lock();
        try { return findByIdInternal(id); }
        finally { rwLock.readLock().unlock(); }
    }

    private Optional<User> findByIdInternal(Long id) {
        User mem = memTable.search(id);
        if (mem != null) return Optional.of(mem);
        Integer pageId = directory.get(id);
        if (pageId != null) {
            for (Page p : pages) if (p.getPageId() == pageId) return p.getRecord(id);
        }
        return Optional.empty();
    }

    public boolean update(User user) {
        rwLock.writeLock().lock();
        try {
            if (memTable.search(user.getId()) != null) {
                memTable.insert(user.getId(), user);
                return true;
            }
            for (Page p : pages) {
                if (p.updateRecord(user)) return true;
            }
            return false;
        } finally { rwLock.writeLock().unlock(); }
    }

    public boolean delete(Long id) {
        rwLock.writeLock().lock();
        try {
            boolean removed = memTable.delete(id);
            directory.remove(id);
            for (Page p : pages) if (p.removeRecord(id)) removed = true;
            return removed;
        } finally { rwLock.writeLock().unlock(); }
    }

    public void flushMemTable() {
        for (User u : memTable.inOrderTraversal()) {
            boolean placed = false;
            for (Page p : pages) {
                if (!p.isFull()) { p.addRecord(u); directory.put(u.getId(), p.getPageId()); placed = true; break; }
            }
            if (!placed) {
                Page newPage = new Page(pages.size(), pageCapacity);
                newPage.addRecord(u);
                pages.add(newPage);
                directory.put(u.getId(), newPage.getPageId());
            }
        }
        memTable.clear();
    }
}`,
    'User.java': `package com.arimas.model;

import java.io.Serializable;

public class User implements Serializable {
    private Long id;
    private String name;
    private String email;
    private String department;
    private int age;
    private double salary;

    public User() {}
    public User(Long id, String name, String email, String department, int age, double salary) {
        this.id = id; this.name = name; this.email = email;
        this.department = department; this.age = age; this.salary = salary;
    }

    public String toTextRecord() {
        return String.format("%d|%s|%s|%s|%d|%.2f", id, name, email, department, age, salary);
    }

    public static User fromTextRecord(String line) {
        String[] parts = line.split("\\\\|", -1);
        return new User(
            Long.parseLong(parts[0]), parts[1], parts[2], parts[3],
            Integer.parseInt(parts[4]), Double.parseDouble(parts[5])
        );
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public double getSalary() { return salary; }
    public void setSalary(double salary) { this.salary = salary; }
}`,
    'UserEntity.java': `package com.arimas.entity;

import com.arimas.model.User;
import java.io.Serializable;

public class UserEntity extends User implements Serializable {
    private static final long serialVersionUID = 1L;

    public UserEntity() {
        super();
    }

    public UserEntity(Long id, String name, String email, String department, int age, double salary) {
        super(id, name, email, department, age, salary);
    }

    public static UserEntity fromUser(User user) {
        if (user == null) return null;
        return new UserEntity(
            user.getId(), user.getName(), user.getEmail(),
            user.getDepartment(), user.getAge(), user.getSalary()
        );
    }
}`,
    'pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.3</version>
    </parent>
    <groupId>com.arimas</groupId>
    <artifactId>arimas-database</artifactId>
    <version>0.0.1-SNAPSHOT</version>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>`
  };

  const totalRecordCount = memTable.length + pages.reduce((acc, p) => acc + p.records.length, 0);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans antialiased flex flex-col">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-6 py-4 flex items-center justify-between backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold tracking-tight text-white">ARIMAS Storage Engine</h1>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                PHASE 1
              </span>
            </div>
            <p className="text-xs text-neutral-400">Distributed Database Prototype • Storage Subsystem</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'simulator'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
            }`}
          >
            Engine Simulator
          </button>
          <button
            id="tab-code"
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'code'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
            }`}
          >
            Java Source Code
          </button>
          <button
            id="tab-report"
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'report'
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
            }`}
          >
            Phase 1 Report
          </button>
          <a
            id="btn-download-zip"
            href="/arimas-database.zip"
            download="arimas-database.zip"
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 transition-colors shadow-sm ml-2"
            title="Download complete project ZIP file ready for VS Code and GitHub"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ZIP</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>MemTable (AVLTree)</span>
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-mono font-bold text-neutral-100">
              {memTable.length} <span className="text-xs text-neutral-500 font-normal">/ 5 threshold</span>
            </div>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>Logical Pages</span>
              <Layers className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-mono font-bold text-neutral-100">
              {pages.length} <span className="text-xs text-neutral-500 font-normal">blocks</span>
            </div>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>Total Records</span>
              <DatabaseIcon className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-mono font-bold text-neutral-100">
              {totalRecordCount} <span className="text-xs text-neutral-500 font-normal">users</span>
            </div>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>Disk Persistence</span>
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xs font-mono text-neutral-300 truncate mt-1">
              {lastPersistedAt}
            </div>
          </div>
        </div>

        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Actions & Insertion */}
            <div className="lg:col-span-4 space-y-6">
              {/* Insert Form */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-neutral-200 text-sm font-medium mb-3">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Insert User Record (O(log N))</span>
                </div>
                <form onSubmit={handleInsert} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1 font-mono">ID (Long)</label>
                      <input
                        id="input-user-id"
                        type="number"
                        value={newId}
                        onChange={e => setNewId(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Name</label>
                      <input
                        id="input-user-name"
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Email</label>
                    <input
                      id="input-user-email"
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-750 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Department</label>
                      <input
                        id="input-user-dept"
                        type="text"
                        value={newDept}
                        onChange={e => setNewDept(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1 font-mono">Age</label>
                      <input
                        id="input-user-age"
                        type="number"
                        value={newAge}
                        onChange={e => setNewAge(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1 font-mono">Salary ($)</label>
                      <input
                        id="input-user-salary"
                        type="number"
                        value={newSalary}
                        onChange={e => setNewSalary(Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-750 rounded px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    id="btn-insert-user"
                    type="submit"
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert into MemTable</span>
                  </button>
                </form>
              </div>

              {/* Point Lookup / Search */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-neutral-200 text-sm font-medium">
                  <Search className="w-4 h-4 text-blue-400" />
                  <span>findById Lookup</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    id="input-search-id"
                    type="number"
                    placeholder="Enter User ID..."
                    value={searchId}
                    onChange={e => setSearchId(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-750 rounded px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    id="btn-search-user"
                    onClick={handleSearch}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
                  >
                    Query
                  </button>
                </div>
                {searchResult && (
                  <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
                    {searchResult}
                  </div>
                )}
              </div>

              {/* Storage Control Actions */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-2.5">
                <div className="text-neutral-200 text-sm font-medium mb-1">Storage Controls</div>
                <button
                  id="btn-flush-memtable"
                  onClick={handleManualFlush}
                  className="w-full bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs py-2 px-3 rounded flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flush MemTable to Page Blocks</span>
                </button>
                <button
                  id="btn-persist-disk"
                  onClick={handlePersistToDisk}
                  className="w-full bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs py-2 px-3 rounded flex items-center justify-center space-x-2 transition-colors"
                >
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Persist to File (arimas_data.db)</span>
                </button>
              </div>

              {/* Engine Log */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-neutral-300 text-xs font-medium mb-2 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Engine Activity Stream</span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-neutral-400 max-h-44 overflow-y-auto pr-1">
                  {statusLog.map((log, i) => (
                    <div key={i} className="leading-relaxed border-b border-neutral-900 pb-0.5">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Visualization of MemTable & Logical Pages */}
            <div className="lg:col-span-8 space-y-6">
              {/* MemTable (AVLTree) Visualizer */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-semibold text-white">In-Memory MemTable (AVLTree)</h2>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    {memTable.length} active nodes (Ordered by ID)
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-4">
                  Incoming writes hit this self-balancing AVL binary search tree first. Provides O(log N) point lookup and sorted sequential drainage into logical Pages.
                </p>

                {memTable.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-xs">
                    MemTable is currently empty (records flushed to Pages).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {memTable.map(user => (
                      <div
                        key={user.id}
                        className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 rounded-lg p-3 transition-colors relative group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                ID: {user.id}
                              </span>
                              <span className="text-xs font-medium text-white">{user.name}</span>
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono mt-1">
                              {user.email}
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-neutral-500 mt-2 font-mono">
                              <span>Dept: {user.department}</span>
                              <span>Age: {user.age}</span>
                              <span className="text-neutral-300 font-medium">${user.salary.toLocaleString()}</span>
                            </div>
                          </div>
                          <button
                            id={`btn-delete-${user.id}`}
                            onClick={() => handleDelete(user.id)}
                            className="opacity-60 hover:opacity-100 text-neutral-400 hover:text-red-400 p-1 transition-opacity"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logical Page Blocks */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-semibold text-white">Fixed-Size Logical Page Blocks</h2>
                  </div>
                  <span className="text-xs font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                    Capacity: 4 records / Page
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-4">
                  Simulated logical blocks representing the fundamental disk I/O unit. Contains slots for records and maintains a dirty state indicator.
                </p>

                {pages.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-xs">
                    No logical Pages allocated yet. Trigger a flush or insert 5+ records to fill Page blocks.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pages.map(page => (
                      <div key={page.pageId} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="font-mono font-bold text-blue-400">PAGE #{page.pageId}</span>
                            <span className="text-neutral-400 font-mono">
                              Slots: {page.records.length} / {page.capacity}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                              page.isDirty
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {page.isDirty ? 'DIRTY (Unflushed to disk)' : 'CLEAN'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {page.records.map(rec => (
                            <div
                              key={rec.id}
                              className="bg-neutral-950/60 border border-neutral-850 rounded p-2 text-xs flex items-center justify-between"
                            >
                              <div>
                                <div className="font-mono font-medium text-neutral-200">
                                  #{rec.id} • {rec.name}
                                </div>
                                <div className="text-[11px] text-neutral-500">
                                  {rec.department} | ${rec.salary.toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete(rec.id)}
                                className="text-neutral-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {Array.from({ length: page.capacity - page.records.length }).map((_, idx) => (
                            <div
                              key={idx}
                              className="border border-dashed border-neutral-800 rounded p-2 text-xs text-neutral-600 font-mono flex items-center justify-center"
                            >
                              Empty Slot
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Storage Text Inspection */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">Local Text File Storage Snapshot</h2>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">arimas_data.db</span>
                </div>
                <p className="text-xs text-neutral-400 mb-3">
                  Disk persistence representation with header metadata, logical page demarcations, and pipe-delimited records.
                </p>
                <pre className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                  {diskFileContent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
            {/* File selection bar */}
            <div className="flex items-center justify-between bg-neutral-900/90 border-b border-neutral-800 px-4 py-2.5">
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {Object.keys(codeFiles).map(fileName => (
                  <button
                    key={fileName}
                    id={`file-tab-${fileName}`}
                    onClick={() => setSelectedCodeFile(fileName)}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors flex items-center space-x-1.5 ${
                      selectedCodeFile === fileName
                        ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>{fileName}</span>
                  </button>
                ))}
              </div>
              <button
                id="btn-copy-code"
                onClick={() => handleCopyCode(codeFiles[selectedCodeFile])}
                className="flex items-center space-x-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 px-2.5 py-1 rounded transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-neutral-950 font-mono text-xs text-neutral-200 overflow-x-auto max-h-[600px] leading-relaxed">
              <pre>{codeFiles[selectedCodeFile]}</pre>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 font-mono text-xs space-y-6 text-neutral-300">
            <div>
              <h2 className="text-base font-bold text-white mb-1">[PHASE 1] IMPLEMENTATION REPORT</h2>
              <p className="text-neutral-400">ARIMAS Distributed Database Prototype - Storage Engine Subsystem</p>
            </div>

            <div className="space-y-2">
              <div className="text-emerald-400 font-bold text-sm">1. Components Built</div>
              <ul className="space-y-1.5 list-disc pl-4 text-neutral-300">
                <li><span className="text-white font-semibold">User</span>: Encapsulates entity attributes (id, name, email, department, age, salary) and provides pipe-delimited serialization contracts.</li>
                <li><span className="text-white font-semibold">AVLTree</span>: Maintains an in-memory, self-balancing MemTable with strict key ordering and O(log N) balance rotations.</li>
                <li><span className="text-white font-semibold">Page</span>: Simulates bounded physical storage blocks containing fixed-capacity record slots with dirty bit flags.</li>
                <li><span className="text-white font-semibold">FileStorage</span>: Provides atomic disk persistence for record streams and page block structures via temp file staging.</li>
                <li><span className="text-white font-semibold">Database</span>: Coordinates write caching through the AVL MemTable, page directory routing, and background block flushes.</li>
                <li><span className="text-white font-semibold">ArimasApplication & UserController</span>: Bootstraps Spring Boot REST endpoints and automated database seeding.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-blue-400 font-bold text-sm">2. Interface Contracts</div>
              <ul className="space-y-1.5 font-mono text-[11px] text-neutral-300">
                <li><code className="text-emerald-300">boolean insert(User user)</code>: Ingests new user into MemTable, triggers page flush at threshold, returns boolean status.</li>
                <li><code className="text-emerald-300">Optional&lt;User&gt; findById(Long id)</code>: Queries MemTable first (O(log N)), falls back to Page directory lookup, returns Optional.</li>
                <li><code className="text-emerald-300">boolean update(User user)</code>: Modifies existing record in place across MemTable or active Page block.</li>
                <li><code className="text-emerald-300">boolean delete(Long id)</code>: Removes user entry from MemTable and Page storage, resetting directory references.</li>
                <li><code className="text-emerald-300">void flushMemTable()</code>: Traverses AVL nodes in-order and assigns records into fixed Page slots.</li>
                <li><code className="text-emerald-300">void savePagesToFile(List&lt;Page&gt; pages, String path)</code>: Atomically flushes page blocks to disk.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-amber-400 font-bold text-sm">3. Testing & Verification</div>
              <p className="text-neutral-300">
                Automated test suite (<code>ArimasDatabaseTest.java</code>) verifies:
              </p>
              <ul className="space-y-1 list-disc pl-4 text-neutral-400">
                <li>User model pipe-delimited serialization and bidirectional reconstruction.</li>
                <li>AVLTree height maintenance, LL/RR/LR/RL rotation validity, and sorted in-order traversal.</li>
                <li>Page capacity limits (4 records/block) and dirty-bit mutation tracking.</li>
                <li>Database CRUD lifecycle, automatic MemTable threshold flushing, and full disk state recovery.</li>
              </ul>
            </div>

            <div className="space-y-1">
              <div className="text-purple-400 font-bold text-sm">4. Next Phase Readiness</div>
              <div>Status: <span className="text-emerald-400 font-bold">READY FOR PHASE 2</span></div>
              <div className="text-neutral-400">Required Input for Next Phase: Specify requirements for the Write-Ahead Log (WAL) journaling engine, buffer pool replacement policy (LRU/Clock), or indexing structure (B+Tree).</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
