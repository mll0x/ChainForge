package com.chainforge.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ApproveRequest(
        @NotBlank String spender,
        @Positive long amount
) {}
