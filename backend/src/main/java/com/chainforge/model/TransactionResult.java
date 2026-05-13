package com.chainforge.model;

public record TransactionResult(
        String transactionHash,
        String from,
        String to,
        String status
) {}
