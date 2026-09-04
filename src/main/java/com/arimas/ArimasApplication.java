package com.arimas;

import com.arimas.model.User;
import com.arimas.storage.Database;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Spring Boot entry point for the ARIMAS distributed database prototype.
 */
@SpringBootApplication
public class ArimasApplication {

    public static void main(String[] args) {
        SpringApplication.run(ArimasApplication.class, args);
    }

    @Bean
    public Database database() {
        // Initializes in-memory engine with page capacity of 4 and MemTable flush threshold of 5
        return new Database("arimas_data.db", 4, 5);
    }

    @Bean
    public CommandLineRunner initData(Database database) {
        return args -> {
            System.out.println("==================================================");
            System.out.println("Initializing ARIMAS Distributed Database Prototype");
            System.out.println("==================================================");

            // Seed initial records into MemTable
            database.insert(new User(101L, "Alice Johnson", "alice@arimas.io", "Core Storage", 32, 125000.0));
            database.insert(new User(102L, "Bob Smith", "bob@arimas.io", "Distributed Systems", 29, 118000.0));
            database.insert(new User(103L, "Carol White", "carol@arimas.io", "Consensus Engineering", 35, 142000.0));

            System.out.println("Seeded 3 records into ARIMAS AVL MemTable.");
            System.out.println("Database Ready.");
        };
    }
}
