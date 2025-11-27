// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProjectRegistry {
    string public projectId = "28e95b6c-c2e5-47d3-9c7b-3f6955d0700a";
    event Registered(address indexed creator, string id);

    function register() external {
        emit Registered(msg.sender, projectId);
    }
}
