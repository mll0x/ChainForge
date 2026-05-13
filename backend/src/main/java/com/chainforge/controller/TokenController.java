package com.chainforge.controller;

import com.chainforge.model.*;
import com.chainforge.service.TokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/token")
@RequiredArgsConstructor
public class TokenController {

    private final TokenService tokenService;

    @PostMapping("/transfer")
    public ApiResponse<TransactionResult> transfer(@Valid @RequestBody TransferRequest request) {
        return ApiResponse.ok(tokenService.transfer(request.to(), request.amount()));
    }

    @PostMapping("/approve")
    public ApiResponse<TransactionResult> approve(@Valid @RequestBody ApproveRequest request) {
        return ApiResponse.ok(tokenService.approve(request.spender(), request.amount()));
    }

    @PostMapping("/mint")
    public ApiResponse<TransactionResult> mint(@Valid @RequestBody MintTokenRequest request) {
        return ApiResponse.ok(tokenService.mint(request.to(), request.amount()));
    }
}
