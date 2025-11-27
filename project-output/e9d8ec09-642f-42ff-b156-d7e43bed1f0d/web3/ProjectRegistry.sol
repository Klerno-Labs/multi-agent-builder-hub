// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProjectRegistry {
    string public projectId = "e9d8ec09-642f-42ff-b156-d7e43bed1f0d";
    event Registered(address indexed creator, string id);

    function register() external {
        emit Registered(msg.sender, projectId);
    }
}
