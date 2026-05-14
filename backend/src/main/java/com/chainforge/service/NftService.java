package com.chainforge.service;

import com.chainforge.contract.MyNFT;
import com.chainforge.model.NftInfo;
import com.chainforge.model.TransactionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class NftService {

    private final MyNFT myNFT;

    public TransactionResult mint(String to) {
        try {
            var receipt = myNFT.mint(to).send();
            log.info("NFT mint: to={}, tx={}", to, receipt.getTransactionHash());
            return new TransactionResult(
                    receipt.getTransactionHash(),
                    receipt.getFrom(),
                    to,
                    receipt.isStatusOK() ? "SUCCESS" : "FAILED"
            );
        } catch (Exception e) {
            log.error("NFT mint failed: to={}", to, e);
            throw new RuntimeException("NFT mint failed: " + e.getMessage(), e);
        }
    }

    public TransactionResult batchMint(String to, int quantity) {
        try {
            var receipt = myNFT.batchMint(to, BigInteger.valueOf(quantity)).send();
            log.info("NFT batchMint: to={}, quantity={}, tx={}", to, quantity, receipt.getTransactionHash());
            return new TransactionResult(
                    receipt.getTransactionHash(),
                    receipt.getFrom(),
                    to,
                    receipt.isStatusOK() ? "SUCCESS" : "FAILED"
            );
        } catch (Exception e) {
            log.error("NFT batchMint failed: to={}, quantity={}", to, quantity, e);
            throw new RuntimeException("NFT batchMint failed: " + e.getMessage(), e);
        }
    }

    public NftInfo getNftInfo(long tokenId) {
        try {
            var owner = myNFT.ownerOf(BigInteger.valueOf(tokenId)).send();
            var tokenURI = myNFT.tokenURI(BigInteger.valueOf(tokenId)).send();
            return new NftInfo(tokenId, owner, tokenURI);
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg != null && msg.contains("ERC721NonexistentToken")) {
                return null;
            }
            log.error("Failed to get NFT info: tokenId={}", tokenId, e);
            throw new RuntimeException("Failed to get NFT info: " + msg, e);
        }
    }

    public long totalMinted() {
        try {
            return myNFT.totalMinted().send().longValue();
        } catch (Exception e) {
            log.error("Failed to get NFT totalMinted", e);
            throw new RuntimeException("Failed to get NFT totalMinted: " + e.getMessage(), e);
        }
    }
}
