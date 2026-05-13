package com.chainforge.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.DefaultGasProvider;

import com.chainforge.contract.MyToken;
import com.chainforge.contract.MyNFT;

@Slf4j
@Configuration
public class Web3jConfig {

    @Value("${web3.rpc-url}")
    private String rpcUrl;

    @Value("${web3.private-key}")
    private String privateKey;

    @Value("${web3.contracts.my-token}")
    private String myTokenAddress;

    @Value("${web3.contracts.my-nft}")
    private String myNftAddress;

    @Bean
    public Web3j web3j() {
        var web3j = Web3j.build(new HttpService(rpcUrl));
        try {
            var blockNumber = web3j.ethBlockNumber().send().getBlockNumber();
            log.info("Connected to Ethereum node at {}, current block: {}", rpcUrl, blockNumber);
        } catch (Exception e) {
            log.warn("Failed to connect to Ethereum node at {}: {}", rpcUrl, e.getMessage());
        }
        return web3j;
    }

    @Bean
    public Credentials credentials() {
        return Credentials.create(privateKey);
    }

    @Bean
    public MyToken myToken(Web3j web3j, Credentials credentials) {
        var token = MyToken.load(myTokenAddress, web3j, credentials, new DefaultGasProvider());
        log.info("MyToken contract loaded at {}", myTokenAddress);
        return token;
    }

    @Bean
    public MyNFT myNFT(Web3j web3j, Credentials credentials) {
        var nft = MyNFT.load(myNftAddress, web3j, credentials, new DefaultGasProvider());
        log.info("MyNFT contract loaded at {}", myNftAddress);
        return nft;
    }
}
