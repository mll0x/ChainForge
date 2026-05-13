package com.chainforge.contract;

import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

import java.math.BigInteger;
import java.util.Collections;
import java.util.List;

public class MyNFT extends Contract {

    public static final String BINARY = "";

    protected MyNFT(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider gasProvider) {
        super(BINARY, contractAddress, web3j, credentials, gasProvider);
    }

    protected MyNFT(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider gasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, gasProvider);
    }

    public static MyNFT load(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider gasProvider) {
        return new MyNFT(contractAddress, web3j, credentials, gasProvider);
    }

    // --- View functions ---

    public RemoteCall<String> name() {
        var function = new Function("name",
                Collections.emptyList(),
                List.of(new TypeReference<Utf8String>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteCall<String> symbol() {
        var function = new Function("symbol",
                Collections.emptyList(),
                List.of(new TypeReference<Utf8String>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteCall<BigInteger> balanceOf(String owner) {
        var function = new Function("balanceOf",
                List.of(new Address(owner)),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<String> ownerOf(BigInteger tokenId) {
        var function = new Function("ownerOf",
                List.of(new Uint256(tokenId)),
                List.of(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteCall<String> tokenURI(BigInteger tokenId) {
        var function = new Function("tokenURI",
                List.of(new Uint256(tokenId)),
                List.of(new TypeReference<Utf8String>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteCall<BigInteger> totalMinted() {
        var function = new Function("totalMinted",
                Collections.emptyList(),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<BigInteger> maxSupply() {
        var function = new Function("maxSupply",
                Collections.emptyList(),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<String> getApproved(BigInteger tokenId) {
        var function = new Function("getApproved",
                List.of(new Uint256(tokenId)),
                List.of(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteCall<Boolean> isApprovedForAll(String owner, String operator) {
        var function = new Function("isApprovedForAll",
                List.of(new Address(owner), new Address(operator)),
                List.of(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    // --- Write functions ---

    public RemoteCall<TransactionReceipt> mint(String to) {
        var function = new Function("mint",
                List.of(new Address(to)),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> batchMint(String to, BigInteger quantity) {
        var function = new Function("batchMint",
                List.of(new Address(to), new Uint256(quantity)),
                Collections.emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> approve(String to, BigInteger tokenId) {
        var function = new Function("approve",
                List.of(new Address(to), new Uint256(tokenId)),
                Collections.emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> transferFrom(String from, String to, BigInteger tokenId) {
        var function = new Function("transferFrom",
                List.of(new Address(from), new Address(to), new Uint256(tokenId)),
                Collections.emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> setBaseURI(String baseURI) {
        var function = new Function("setBaseURI",
                List.of(new Utf8String(baseURI)),
                Collections.emptyList());
        return executeRemoteCallTransaction(function);
    }
}
