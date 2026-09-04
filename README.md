# ARIMAS Distributed Database Prototype

A robust distributed database storage engine prototype featuring an in-memory AVLTree MemTable, bounded logical Page blocks, transactional in-memory Database coordinator, local text FileStorage durability, Spring Boot REST controllers, and a visual diagnostic UI.

---

## Complete Project File Structure

```
arimas-database/
├── pom.xml                                      # Maven build descriptor (Java 17, Spring Boot 3.3.3, Jackson, JUnit 5)
├── README.md                                    # Complete setup, running, architecture & GitHub push guide
├── .env.example                                 # Environment variable declarations template
├── .gitignore                                   # Standard git ignore for Java/Maven/Node/Vite
├── metadata.json                                # AI Studio application metadata
├── package.json                                 # Node.js dependencies for frontend interactive dashboard
├── tsconfig.json                                # TypeScript compiler configuration
├── vite.config.ts                               # Vite frontend build & plugin configuration
├── index.html                                   # HTML5 web entry point
├── .vscode/
│   ├── launch.json                              # VS Code debug & run profiles (Spring Boot + Vite)
│   └── settings.json                            # VS Code workspace Java & Maven settings
├── src/
│   ├── App.tsx                                  # React interactive storage visualizer & simulator
│   ├── index.css                                # Global CSS stylesheet with Tailwind CSS
│   ├── main.tsx                                 # React application bootstrap entry
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── arimas/
│   │   │           ├── ArimasApplication.java   # Spring Boot application main class & data seeder
│   │   │           ├── controller/
│   │   │           │   └── UserController.java  # REST API controller exposing CRUD, flush, persist & stats
│   │   │           ├── entity/
│   │   │           │   └── UserEntity.java      # Entity mapping representation extending User model
│   │   │           ├── memtable/
│   │   │           │   └── AVLTree.java         # In-memory self-balancing binary search tree (MemTable)
│   │   │           ├── model/
│   │   │           │   └── User.java            # Relational User model with pipe-delimited text serialization
│   │   │           └── storage/
│   │   │               ├── Database.java        # Central storage engine coordinating MemTable, Pages & disk
│   │   │               ├── FileStorage.java     # Atomic disk persistence serializer/deserializer
│   │   │               └── Page.java            # Simulated fixed-capacity logical block (disk I/O unit)
│   │   └── resources/
│   │       └── application.properties           # Spring Boot configuration (server port, storage paths)
│   └── test/
│       └── java/
│           └── com/
│               └── arimas/
│                   └── ArimasDatabaseTest.java  # Comprehensive JUnit 5 test suite
└── public/
    └── assets/
        └── aistudio/
            └── .gitignore
```

---

## Component Specifications

| Class / File | Package / Directory | Responsibility |
| :--- | :--- | :--- |
| `User.java` | `com.arimas.model` | Holds record attributes (`id`, `name`, `email`, `department`, `age`, `salary`) and executes bidirectional pipe-delimited serialization (`toTextRecord()`, `fromTextRecord()`). |
| `UserEntity.java` | `com.arimas.entity` | Entity adapter layer extending `User` for persistence mapping. |
| `AVLTree.java` | `com.arimas.memtable` | Self-balancing binary tree acting as write-buffer MemTable with $O(\log N)$ point lookups, LL/RR/LR/RL balancing, and ordered draining. |
| `Page.java` | `com.arimas.storage` | Fixed-capacity logical storage block (default 4 records) simulating disk blocks with dirty state tracking and pin counting. |
| `FileStorage.java` | `com.arimas.storage` | Atomically persists records and page blocks to disk (`arimas_data.db`) using safe temporary file replacement. |
| `Database.java` | `com.arimas.storage` | Thread-safe database coordinator orchestrating AVL MemTable writes, Page directory lookups, automatic flushes, and disk synchronization. |
| `UserController.java`| `com.arimas.controller`| Spring REST endpoints (`/api/users`) handling HTTP CRUD, manual MemTable flushing, disk persistence, and diagnostic statistics. |
| `ArimasApplication.java`| `com.arimas` | Spring Boot main application entry point and CommandLineRunner data seeder. |
| `ArimasDatabaseTest.java`| `com.arimas` (test) | Unit tests verifying AVL rebalancing, Page boundary constraints, serialization consistency, and full CRUD cycles. |

---

## Local Development & Setup Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Java JDK 17** or higher (`java -version`)
- **Apache Maven 3.8+** (`mvn -version`)
- **Node.js 18+** and **npm** (`node -v`, `npm -v`)
- **Visual Studio Code** with the **Extension Pack for Java** and **Spring Boot Extension Pack**

---

### 2. Opening in VS Code
1. Launch **VS Code**.
2. Go to **File > Open Folder...** and select the extracted `arimas-database` root folder.
3. VS Code will automatically detect the Maven `pom.xml` and configure Java classpath, dependencies, and language services via `.vscode/settings.json`.

---

### 3. Running the Spring Boot Backend

#### Build and Test:
```bash
# Clean and compile the project, run test suite
mvn clean test

# Package into an executable JAR
mvn package
```

#### Run the Application:
```bash
# Run directly with Maven
mvn spring-boot:run
```

The Spring Boot backend will start on **port 8080**:
- Health & Data Seed: Console logs confirm MemTable initialization and sample records.
- API Base URL: `http://localhost:8080/api/users`

#### REST Endpoints:
- `GET /api/users` - Retrieve all users across MemTable and Pages.
- `GET /api/users/{id}` - Point query by user ID (MemTable first, then Page directory).
- `POST /api/users` - Insert a new user record.
- `PUT /api/users/{id}` - Update existing user record.
- `DELETE /api/users/{id}` - Delete user record.
- `POST /api/users/flush` - Manually flush AVLTree MemTable into Page blocks.
- `POST /api/users/persist` - Flush and persist database state to `arimas_data.db`.
- `POST /api/users/load` - Restore database state from `arimas_data.db`.
- `GET /api/users/stats` - Fetch storage statistics (total records, MemTable size, page allocations).

---

### 4. Running the Frontend Interactive Visualizer

Open a second terminal in the project root:

```bash
# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser at `http://localhost:3000` (or the URL printed in the terminal). The UI provides:
- Live MemTable AVL visualizer with active nodes.
- Logical Page blocks with slot capacity indicators and dirty bit flags.
- Direct User insert, search, and delete controls.
- FileStorage text snapshot inspector (`arimas_data.db`).
- Code viewer with one-click copy and export.

---

### 5. Pushing to an Existing GitHub Repository

To push this complete project to your existing GitHub repository:

```bash
# 1. Initialize git (if not already a git repository)
git init

# 2. Add all files to staging
git add .

# 3. Create your initial commit
git commit -m "feat: complete ARIMAS database prototype (Phase 1 storage engine)"

# 4. Set the main branch
git branch -M main

# 5. Link your existing GitHub repository
# Replace <YOUR-GITHUB-USERNAME> and <YOUR-REPO-NAME> with your actual repository URL
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<YOUR-REPO-NAME>.git

# 6. Push to GitHub (use -u to set upstream tracking)
git push -u origin main --force
```

If your remote repository already contains a README or commits:
```bash
git pull origin main --rebase
git push -u origin main
```
