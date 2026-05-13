package com.chainforge.contract;

import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class MyToken extends Contract {

    public static final String BINARY = "";

    protected MyToken(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider gasProvider) {
        super(BINARY, contractAddress, web3j, credentials, gasProvider);
    }

    protected MyToken(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider gasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, gasProvider);
    }

    public static MyToken load(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider gasProvider) {
        return new MyToken(contractAddress, web3j, credentials, gasProvider);
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

    public RemoteCall<BigInteger> decimals() {
        var function = new Function("decimals",
                Collections.emptyList(),
                List.of(new TypeReference<Uint8>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<BigInteger> totalSupply() {
        var function = new Function("totalSupply",
                Collections.emptyList(),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<BigInteger> balanceOf(String address) {
        var function = new Function("balanceOf",
                List.of(new Address(address)),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<BigInteger> allowance(String owner, String spender) {
        var function = new Function("allowance",
                List.of(new Address(owner), new Address(spender)),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteCall<BigInteger> maxSupply() {
        var function = new Function("maxSupply",
                Collections.emptyList(),
                List.of(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    // --- Write functions ---

    public RemoteCall<TransactionReceipt> transfer(String to, BigInteger amount) {
        var function = new Function("transfer",
                List.of(new Address(to), new Uint256(amount)),
                List.of(new TypeReference<Bool>() {}));
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> approve(String spender, BigInteger amount) {
        var function = new Function("approve",
                List.of(new Address(spender), new Uint256(amount)),
                List.of(new TypeReference<Bool>() {}));
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> transferFrom(String from, String to, BigInteger amount) {
        var function = new Function("transferFrom",
                List.of(new Address(from), new Address(to), new Uint256(amount)),
                List.of(new TypeReference<Bool>() {}));
        return executeRemoteCallTransaction(function);
    }

    public RemoteCall<TransactionReceipt> mint(String to, BigInteger amount) {
        var function = new Function("mint",
                List.of(new Address(to), new Uint256(amount)),
                Collections.emptyList());
        return executeRemoteCallTransaction(function);
    }
}
