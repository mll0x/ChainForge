package com.chainforge.model;

public record NftInfo(
        long tokenId,
        String owner,
        String tokenURI
) {}
