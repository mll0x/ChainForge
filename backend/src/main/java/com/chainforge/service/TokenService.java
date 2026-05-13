package com.chainforge.service;

import com.chainforge.contract.MyToken;
import com.chainforge.model.TransactionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {

    private final MyToken myToken;

    public TransactionResult transfer(String to, long amount) {
        try {
            var decimals = myToken.decimals().send();
            var amountWithDecimals = BigInteger.valueOf(amount)
                    .multiply(BigInteger.TEN.pow(decimals.intValue()));
            var receipt = myToken.transfer(to, amountWithDecimals).send();
            log.info("Token transfer: {} -> {} amount={}, tx={}",
                    receipt.getFrom(), to, amount, receipt.getTransactionHash());
            return new TransactionResult(
                    receipt.getTransactionHash(),
                    receipt.getFrom(),
                    to,
                    receipt.isStatusOK() ? "SUCCESS" : "FAILED"
            );
        } catch (Exception e) {
            log.error("Token transfer failed: to={}, amount={}", to, amount, e);
            throw new RuntimeException("Token transfer failed: " + e.getMessage(), e);
        }
    }

    public TransactionResult approve(String spender, long amount) {
        try {
            var decimals = myToken.decimals().send();
            var amountWithDecimals = BigInteger.valueOf(amount)
                    .multiply(BigInteger.TEN.pow(decimals.intValue()));
            var receipt = myToken.approve(spender, amountWithDecimals).send();
            log.info("Token approve: spender={} amount={}, tx={}", spender, amount, receipt.getTransactionHash());
            return new TransactionResult(
                    receipt.getTransactionHash(),
                    receipt.getFrom(),
                    spender,
                    receipt.isStatusOK() ? "SUCCESS" : "FAILED"
            );
        } catch (Exception e) {
            log.error("Token approve failed: spender={}, amount={}", spender, amount, e);
            throw new RuntimeException("Token approve failed: " + e.getMessage(), e);
        }
    }

    public TransactionResult mint(String to, long amount) {
        try {
            var receipt = myToken.mint(to, BigInteger.valueOf(amount)).send();
            log.info("Token mint: to={} amount={}, tx={}", to, amount, receipt.getTransactionHash());
            return new TransactionResult(
                    receipt.getTransactionHash(),
                    receipt.getFrom(),
                    to,
                    receipt.isStatusOK() ? "SUCCESS" : "FAILED"
            );
        } catch (Exception e) {
            log.error("Token mint failed: to={}, amount={}", to, amount, e);
            throw new RuntimeException("Token mint failed: " + e.getMessage(), e);
        }
    }
}
