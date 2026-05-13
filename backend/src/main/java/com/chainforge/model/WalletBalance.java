package com.chainforge.model;

public record WalletBalance(
        String address,
        String ethBalance,
        String tokenBalance,
        String tokenSymbol
) {}
