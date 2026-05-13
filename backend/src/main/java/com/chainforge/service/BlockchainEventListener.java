package com.chainforge.service;

import com.chainforge.contract.MyToken;
import com.chainforge.contract.MyNFT;
import io.reactivex.disposables.Disposable;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.filters.Filter;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.Log;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlockchainEventListener {

    private final Web3j web3j;
    private final MyToken myToken;
    private final MyNFT myNFT;
    private final List<Disposable> subscriptions = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void startListening() {
        listenTokenTransfers();
        listenTokenApprovals();
        listenNftTransfers();
        listenNftApprovals();
        log.info("Blockchain event listeners started");
    }

    private void listenTokenTransfers() {
        var transferEvent = new Event("Transfer",
                List.of(
                        new TypeReference<Address>(true) {},
                        new TypeReference<Address>(true) {},
                        new TypeReference<Uint256>(false) {}
                ));

        var filter = new EthFilter(
                DefaultBlockParameterName.LATEST,
                DefaultBlockParameterName.LATEST,
                myToken.getContractAddress());

        var sub = web3j.ethLogFlowable(filter).subscribe(logEvent -> {
            log.info("[ERC20 Transfer] tx={}, logIndex={}", logEvent.getTransactionHash(), logEvent.getLogIndex());
        }, error -> log.error("Error listening to ERC20 Transfer events", error));

        subscriptions.add(sub);
    }

    private void listenTokenApprovals() {
        var filter = new EthFilter(
                DefaultBlockParameterName.LATEST,
                DefaultBlockParameterName.LATEST,
                myToken.getContractAddress());

        var sub = web3j.ethLogFlowable(filter).subscribe(logEvent -> {
            var topics = logEvent.getTopics();
            if (topics != null && !topics.isEmpty()) {
                var eventSig = topics.get(0);
                // Approval event signature: 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925
                if ("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925".equals(eventSig)) {
                    log.info("[ERC20 Approval] tx={}, logIndex={}", logEvent.getTransactionHash(), logEvent.getLogIndex());
                }
            }
        }, error -> log.error("Error listening to ERC20 Approval events", error));

        subscriptions.add(sub);
    }

    private void listenNftTransfers() {
        var filter = new EthFilter(
                DefaultBlockParameterName.LATEST,
                DefaultBlockParameterName.LATEST,
                myNFT.getContractAddress());

        var sub = web3j.ethLogFlowable(filter).subscribe(logEvent -> {
            var topics = logEvent.getTopics();
            if (topics != null && !topics.isEmpty()) {
                var eventSig = topics.get(0);
                // Transfer event signature (ERC721): 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
                if ("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef".equals(eventSig)) {
                    log.info("[ERC721 Transfer] tx={}, logIndex={}", logEvent.getTransactionHash(), logEvent.getLogIndex());
                }
            }
        }, error -> log.error("Error listening to ERC721 Transfer events", error));

        subscriptions.add(sub);
    }

    private void listenNftApprovals() {
        var filter = new EthFilter(
                DefaultBlockParameterName.LATEST,
                DefaultBlockParameterName.LATEST,
                myNFT.getContractAddress());

        var sub = web3j.ethLogFlowable(filter).subscribe(logEvent -> {
            var topics = logEvent.getTopics();
            if (topics != null && !topics.isEmpty()) {
                var eventSig = topics.get(0);
                // Approval event signature (ERC721): 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925
                if ("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925".equals(eventSig)) {
                    log.info("[ERC721 Approval] tx={}, logIndex={}", logEvent.getTransactionHash(), logEvent.getLogIndex());
                }
            }
        }, error -> log.error("Error listening to ERC721 Approval events", error));

        subscriptions.add(sub);
    }

    @PreDestroy
    public void stopListening() {
        subscriptions.forEach(Disposable::dispose);
        subscriptions.clear();
        log.info("Blockchain event listeners stopped");
    }
}
