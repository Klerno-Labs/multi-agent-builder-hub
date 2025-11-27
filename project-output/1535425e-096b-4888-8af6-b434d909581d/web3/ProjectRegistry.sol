// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProjectRegistry {
    string public projectId = "1535425e-096b-4888-8af6-b434d909581d";
    event Registered(address indexed creator, string id);

    function register() external {
        emit Registered(msg.sender, projectId);
    }
}
