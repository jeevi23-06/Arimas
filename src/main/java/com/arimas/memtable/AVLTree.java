package com.arimas.memtable;

import com.arimas.model.User;

import java.util.ArrayList;
import java.util.List;

/**
 * Self-balancing AVL Tree implementation functioning as the in-memory MemTable.
 * Maintains incoming records strictly ordered by user ID with O(log N) operations
 * prior to page flushing and disk persistence.
 */
public class AVLTree {

    public static class Node {
        private Long key;
        private User value;
        private int height;
        private Node left;
        private Node right;

        public Node(Long key, User value) {
            this.key = key;
            this.value = value;
            this.height = 1;
        }

        public Long getKey() {
            return key;
        }

        public User getValue() {
            return value;
        }

        public void setValue(User value) {
            this.value = value;
        }

        public int getHeight() {
            return height;
        }

        public Node getLeft() {
            return left;
        }

        public Node getRight() {
            return right;
        }
    }

    private Node root;
    private int size = 0;

    public AVLTree() {
        this.root = null;
        this.size = 0;
    }

    public synchronized void insert(Long key, User value) {
        if (key == null || value == null) {
            throw new IllegalArgumentException("Key and User cannot be null");
        }
        int previousSize = size;
        root = insertRec(root, key, value);
        if (size == previousSize) {
            // Updated existing node without size increase
        }
    }

    private Node insertRec(Node node, Long key, User value) {
        if (node == null) {
            size++;
            return new Node(key, value);
        }

        if (key < node.key) {
            node.left = insertRec(node.left, key, value);
        } else if (key > node.key) {
            node.right = insertRec(node.right, key, value);
        } else {
            // Key already exists: update record in place
            node.value = value;
            return node;
        }

        // Update height of current node
        node.height = 1 + Math.max(height(node.left), height(node.right));

        // Rebalance
        return rebalance(node, key);
    }

    public synchronized User search(Long key) {
        if (key == null) return null;
        Node curr = root;
        while (curr != null) {
            if (key.equals(curr.key)) {
                return curr.value;
            } else if (key < curr.key) {
                curr = curr.left;
            } else {
                curr = curr.right;
            }
        }
        return null;
    }

    public synchronized boolean delete(Long key) {
        if (key == null || search(key) == null) {
            return false;
        }
        root = deleteRec(root, key);
        size--;
        return true;
    }

    private Node deleteRec(Node node, Long key) {
        if (node == null) {
            return null;
        }

        if (key < node.key) {
            node.left = deleteRec(node.left, key);
        } else if (key > node.key) {
            node.right = deleteRec(node.right, key);
        } else {
            // Node to delete found
            if (node.left == null || node.right == null) {
                Node temp = (node.left != null) ? node.left : node.right;
                if (temp == null) {
                    // No child case
                    node = null;
                } else {
                    // One child case
                    node = temp;
                }
            } else {
                // Two children case: get inorder successor (smallest in the right subtree)
                Node temp = minValueNode(node.right);
                node.key = temp.key;
                node.value = temp.value;
                node.right = deleteRec(node.right, temp.key);
            }
        }

        if (node == null) {
            return null;
        }

        node.height = 1 + Math.max(height(node.left), height(node.right));

        int balance = getBalance(node);

        // Left Left Case
        if (balance > 1 && getBalance(node.left) >= 0) {
            return rightRotate(node);
        }

        // Left Right Case
        if (balance > 1 && getBalance(node.left) < 0) {
            node.left = leftRotate(node.left);
            return rightRotate(node);
        }

        // Right Right Case
        if (balance < -1 && getBalance(node.right) <= 0) {
            return leftRotate(node);
        }

        // Right Left Case
        if (balance < -1 && getBalance(node.right) > 0) {
            node.right = rightRotate(node.right);
            return leftRotate(node);
        }

        return node;
    }

    private Node rebalance(Node node, Long key) {
        int balance = getBalance(node);

        // Left Left Case
        if (balance > 1 && key < node.left.key) {
            return rightRotate(node);
        }

        // Right Right Case
        if (balance < -1 && key > node.right.key) {
            return leftRotate(node);
        }

        // Left Right Case
        if (balance > 1 && key > node.left.key) {
            node.left = leftRotate(node.left);
            return rightRotate(node);
        }

        // Right Left Case
        if (balance < -1 && key < node.right.key) {
            node.right = rightRotate(node.right);
            return leftRotate(node);
        }

        return node;
    }

    private Node rightRotate(Node y) {
        Node x = y.left;
        Node t2 = x.right;

        x.right = y;
        y.left = t2;

        y.height = Math.max(height(y.left), height(y.right)) + 1;
        x.height = Math.max(height(x.left), height(x.right)) + 1;

        return x;
    }

    private Node leftRotate(Node x) {
        Node y = x.right;
        Node t2 = y.left;

        y.left = x;
        x.right = t2;

        x.height = Math.max(height(x.left), height(x.right)) + 1;
        y.height = Math.max(height(y.left), height(y.right)) + 1;

        return y;
    }

    private int height(Node n) {
        return (n == null) ? 0 : n.height;
    }

    private int getBalance(Node n) {
        return (n == null) ? 0 : height(n.left) - height(n.right);
    }

    private Node minValueNode(Node node) {
        Node current = node;
        while (current.left != null) {
            current = current.left;
        }
        return current;
    }

    public synchronized List<User> inOrderTraversal() {
        List<User> list = new ArrayList<>();
        inOrderRec(root, list);
        return list;
    }

    private void inOrderRec(Node node, List<User> list) {
        if (node != null) {
            inOrderRec(node.left, list);
            list.add(node.value);
            inOrderRec(node.right, list);
        }
    }

    public synchronized int size() {
        return size;
    }

    public synchronized boolean isEmpty() {
        return size == 0;
    }

    public synchronized void clear() {
        root = null;
        size = 0;
    }

    public synchronized boolean isThresholdReached(int maxCapacity) {
        return size >= maxCapacity;
    }

    public Node getRoot() {
        return root;
    }
}
