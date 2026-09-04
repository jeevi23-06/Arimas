package com.arimas.cluster;

import java.util.Random;

public class DatabaseNode implements Runnable {
    private final String nodeId;
    private volatile RaftState state;
    private volatile int currentTerm;
    private volatile boolean running = true;
    private ClusterManager manager;
    private final Random random = new Random();

    public DatabaseNode(String nodeId) {
        this.nodeId = nodeId;
        this.state = RaftState.FOLLOWER;
        this.currentTerm = 0;
    }
    
    public void setClusterManager(ClusterManager manager) {
        this.manager = manager;
    }

    public String getNodeId() { return nodeId; }
    public RaftState getState() { return state; }
    public int getCurrentTerm() { return currentTerm; }
    public void setState(RaftState state) { this.state = state; }
    public void setCurrentTerm(int term) { this.currentTerm = term; }
    public void stop() { this.running = false; }

    @Override
    public void run() {
        while (running) {
            try {
                // Randomized election timeout
                int timeout = 1500 + random.nextInt(1500);
                Thread.sleep(timeout);
                
                if (state == RaftState.FOLLOWER || state == RaftState.CANDIDATE) {
                    state = RaftState.CANDIDATE;
                    currentTerm++;
                    
                    if (manager != null && manager.requestVotes(this, currentTerm)) {
                        state = RaftState.LEADER;
                    } else {
                        state = RaftState.FOLLOWER;
                    }
                } else if (state == RaftState.LEADER) {
                    // Send heartbeats
                    if (manager != null) {
                        manager.sendHeartbeat(this, currentTerm);
                    }
                }
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
