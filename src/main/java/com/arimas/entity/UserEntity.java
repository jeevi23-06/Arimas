package com.arimas.entity;

import com.arimas.model.User;

import java.io.Serializable;

/**
 * Entity representation for User records in the ARIMAS database engine.
 * Extends the core User model to support persistence mapping.
 */
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
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getDepartment(),
                user.getAge(),
                user.getSalary()
        );
    }
}
