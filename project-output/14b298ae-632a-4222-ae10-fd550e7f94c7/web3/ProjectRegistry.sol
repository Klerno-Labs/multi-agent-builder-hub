// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProjectRegistry {
    string public projectId = "14b298ae-632a-4222-ae10-fd550e7f94c7";
    event Registered(address indexed creator, string id);

    function register() external {
        emit Registered(msg.sender, projectId);
    }
}
