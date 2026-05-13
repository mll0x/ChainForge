package com.chainforge.controller;

import com.chainforge.model.ApiResponse;
import com.chainforge.model.WalletBalance;
import com.chainforge.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/{address}/balance")
    public ApiResponse<WalletBalance> getBalance(@PathVariable String address) {
        return ApiResponse.ok(walletService.getBalance(address));
    }
}
