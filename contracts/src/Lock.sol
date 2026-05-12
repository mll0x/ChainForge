// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    constructor(uint256 _unlockTime) payable {
        require(block.timestamp < _unlockTime, "Unlock time should be in the future");
        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() external {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");
        owner.transfer(address(this).balance);
    }
}
