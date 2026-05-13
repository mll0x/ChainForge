package com.chainforge.controller;

import com.chainforge.model.*;
import com.chainforge.service.NftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/nft")
@RequiredArgsConstructor
public class NftController {

    private final NftService nftService;

    @PostMapping("/mint")
    public ApiResponse<TransactionResult> mint(@Valid @RequestBody MintNftRequest request) {
        if (request.quantity() == 1) {
            return ApiResponse.ok(nftService.mint(request.to()));
        }
        return ApiResponse.ok(nftService.batchMint(request.to(), request.quantity()));
    }

    @GetMapping("/{tokenId}")
    public ApiResponse<NftInfo> getNftInfo(@PathVariable long tokenId) {
        return ApiResponse.ok(nftService.getNftInfo(tokenId));
    }
}
