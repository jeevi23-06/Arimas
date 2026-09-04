package com.arimas.cluster;

import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ClusterManager {
    private final List<DatabaseNode> nodes = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void initCluster() {
        nodes.add(new DatabaseNode("node-1"));
        nodes.add(new DatabaseNode("node-2"));
        nodes.add(new DatabaseNode("node-3"));
        
        for (DatabaseNode node : nodes) {
            node.setClusterManager(this);
            Thread t = new Thread(node, node.getNodeId() + "-thread");
            t.setDaemon(true);
            t.start();
        }
    }

    @PreDestroy
    public void shutdownCluster() {
        for (DatabaseNode node : nodes) {
            node.stop();
        }
    }

    public List<DatabaseNode> getNodes() {
        return nodes;
    }

    public synchronized boolean requestVotes(DatabaseNode candidate, int term) {
        int votes = 1;
        for (DatabaseNode node : nodes) {
            if (!node.getNodeId().equals(candidate.getNodeId())) {
                if (node.getCurrentTerm() <= term) {
                    node.setCurrentTerm(term);
                    node.setState(RaftState.FOLLOWER);
                    votes++;
                }
            }
        }
        return votes > (nodes.size() / 2);
    }
    
    public synchronized void sendHeartbeat(DatabaseNode leader, int term) {
        for (DatabaseNode node : nodes) {
            if (!node.getNodeId().equals(leader.getNodeId())) {
                node.setCurrentTerm(term);
                node.setState(RaftState.FOLLOWER);
            }
        }
    }
}
