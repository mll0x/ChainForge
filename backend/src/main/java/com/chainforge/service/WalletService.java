package com.chainforge.service;

import com.chainforge.contract.MyToken;
import com.chainforge.model.WalletBalance;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.protocol.Web3j;
import org.web3j.utils.Convert;

import java.math.BigDecimal;
import java.math.BigInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final Web3j web3j;
    private final MyToken myToken;

    public WalletBalance getBalance(String address) {
        try {
            var ethBalance = web3j.ethGetBalance(address, org.web3j.protocol.core.DefaultBlockParameterName.LATEST)
                    .send().getBalance();
            var ethInEther = Convert.fromWei(new BigDecimal(ethBalance), Convert.Unit.ETHER).toPlainString();

            var tokenBalanceRaw = myToken.balanceOf(address).send();
            var decimals = myToken.decimals().send();
            var symbol = myToken.symbol().send();
            var tokenBalance = new BigDecimal(tokenBalanceRaw)
                    .divide(BigDecimal.TEN.pow(decimals.intValue()), 18, java.math.RoundingMode.DOWN)
                    .stripTrailingZeros().toPlainString();

            return new WalletBalance(address, ethInEther, tokenBalance, symbol);
        } catch (Exception e) {
            log.error("Failed to get balance for {}", address, e);
            throw new RuntimeException("Failed to get balance: " + e.getMessage(), e);
        }
    }

    public BigInteger getEthBalance(String address) {
        try {
            return web3j.ethGetBalance(address, org.web3j.protocol.core.DefaultBlockParameterName.LATEST)
                    .send().getBalance();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get ETH balance: " + e.getMessage(), e);
        }
    }
}
