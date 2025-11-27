// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProjectRegistry {
    string public projectId = "2b5d2ee8-f1b9-4e50-888b-97bb80e16129";
    event Registered(address indexed creator, string id);

    function register() external {
        emit Registered(msg.sender, projectId);
    }
}
