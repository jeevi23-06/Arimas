package com.arimas.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * User model representing stored relational record in the ARIMAS database.
 */
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private String email;
    private String department;
    private int age;
    private double salary;

    public User() {
    }

    public User(Long id, String name, String email, String department, int age, double salary) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.department = department;
        this.age = age;
        this.salary = salary;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public double getSalary() {
        return salary;
    }

    public void setSalary(double salary) {
        this.salary = salary;
    }

    /**
     * Serializes User record into a formatted pipe-delimited text line for file persistence.
     */
    public String toTextRecord() {
        return String.format("%d|%s|%s|%s|%d|%.2f",
                id,
                escapeText(name),
                escapeText(email),
                escapeText(department),
                age,
                salary);
    }

    /**
     * Deserializes User record from a pipe-delimited text line.
     */
    public static User fromTextRecord(String line) {
        if (line == null || line.trim().isEmpty() || line.startsWith("#")) {
            return null;
        }
        String[] parts = line.split("\\|", -1);
        if (parts.length < 6) {
            throw new IllegalArgumentException("Malformed record format: " + line);
        }
        Long id = Long.parseLong(parts[0].trim());
        String name = unescapeText(parts[1].trim());
        String email = unescapeText(parts[2].trim());
        String department = unescapeText(parts[3].trim());
        int age = Integer.parseInt(parts[4].trim());
        double salary = Double.parseDouble(parts[5].trim());

        return new User(id, name, email, department, age, salary);
    }

    private static String escapeText(String value) {
        return value == null ? "" : value.replace("|", "\\|");
    }

    private static String unescapeText(String value) {
        return value == null ? "" : value.replace("\\|", "|");
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return age == user.age &&
                Double.compare(user.salary, salary) == 0 &&
                Objects.equals(id, user.id) &&
                Objects.equals(name, user.name) &&
                Objects.equals(email, user.email) &&
                Objects.equals(department, user.department);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, email, department, age, salary);
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", department='" + department + '\'' +
                ", age=" + age +
                ", salary=" + salary +
                '}';
    }
}
