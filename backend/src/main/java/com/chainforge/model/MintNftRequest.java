package com.chainforge.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record MintNftRequest(
        @NotBlank String to,
        @Positive int quantity
) {}
