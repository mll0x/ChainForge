package com.chainforge.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record TransferRequest(
        @NotBlank String to,
        @Positive long amount
) {}
