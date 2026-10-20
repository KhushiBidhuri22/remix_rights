// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RemixRegistry
/// @notice Hackathon MVP: registers content hashes, remix parent links, license
///         references and royalty rules. It does NOT prove legal copyright ownership;
///         it gives a timestamped, tamper-evident record of what a wallet declared.
/// @dev    Only hashes and short references are stored on-chain, never media bytes.
///         Royalty split is one level deep (remix -> its direct parent).
contract RemixRegistry {
    struct Asset {
        address creator;
        bytes32 contentHash;     // SHA-256 of the exact file bytes (computed off-chain)
        uint256 parentId;        // 0 = original, otherwise an existing asset id
        string licenseRef;       // e.g. "CC-BY-4.0" or a URL
        uint16 royaltyBps;       // share this asset's creator requires from ITS remixes (2000 = 20%)
        uint16 parentShareBps;   // snapshot of parent's royaltyBps at registration (0 for originals)
        bool allowRemix;
        bool allowCommercial;
        uint64 registeredAt;
        bool exists;
    }

    uint256 public assetCount;
    mapping(uint256 => Asset) private assets;
    mapping(bytes32 => uint256) public idByHash;      // 0 = not registered
    mapping(address => uint256) public balances;      // pull-payment balances (testnet funds)

    event AssetRegistered(
        uint256 indexed id,
        address indexed creator,
        uint256 indexed parentId,
        bytes32 contentHash,
        string licenseRef
    );
    event RevenueDistributed(uint256 indexed id, uint256 total, uint256 toCreator, uint256 toParent);
    event Withdrawn(address indexed to, uint256 amount);

    function registerOriginal(
        bytes32 contentHash,
        string calldata licenseRef,
        bool allowRemix,
        bool allowCommercial,
        uint16 royaltyBps
    ) external returns (uint256 id) {
        require(royaltyBps <= 10000, "royalty > 100%");
        id = _create(0, contentHash, licenseRef, royaltyBps, 0, allowRemix, allowCommercial);
    }

    /// @notice Register a remix. The parent's royalty is snapshotted so later
    ///         changes cannot silently alter the agreed terms.
    function registerRemix(
        uint256 parentId,
        bytes32 contentHash,
        string calldata licenseRef,
        bool allowRemix,
        bool allowCommercial,
        uint16 royaltyBps
    ) external returns (uint256 id) {
        require(royaltyBps <= 10000, "royalty > 100%");
        Asset storage parent = assets[parentId];
        require(parentId != 0 && parent.exists, "parent missing");
        require(parent.allowRemix, "parent forbids remix");
        id = _create(parentId, contentHash, licenseRef, royaltyBps, parent.royaltyBps, allowRemix, allowCommercial);
    }

    function getAsset(uint256 id) external view returns (Asset memory) {
        require(assets[id].exists, "unknown asset");
        return assets[id];
    }

    /// @notice True if `contentHash` equals the hash registered for `id`.
    function verifyAsset(uint256 id, bytes32 contentHash) external view returns (bool) {
        return assets[id].exists && assets[id].contentHash == contentHash;
    }

    /// @notice Split testnet funds sent with this call between the asset creator
    ///         and (for remixes) the parent creator. Funds become withdrawable balances.
    function distributeRevenue(uint256 id) external payable {
        Asset storage a = assets[id];
        require(a.exists, "unknown asset");
        require(msg.value > 0, "no value");

        uint256 toParent = 0;
        if (a.parentId != 0) {
            toParent = (msg.value * a.parentShareBps) / 10000;
            balances[assets[a.parentId].creator] += toParent;
        }
        uint256 toCreator = msg.value - toParent;
        balances[a.creator] += toCreator;

        emit RevenueDistributed(id, msg.value, toCreator, toParent);
    }

    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "nothing to withdraw");
        balances[msg.sender] = 0; // effects before interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function _create(
        uint256 parentId,
        bytes32 contentHash,
        string calldata licenseRef,
        uint16 royaltyBps,
        uint16 parentShareBps,
        bool allowRemix,
        bool allowCommercial
    ) private returns (uint256 id) {
        require(contentHash != bytes32(0), "empty hash");
        require(idByHash[contentHash] == 0, "hash already registered");
        require(bytes(licenseRef).length > 0 && bytes(licenseRef).length <= 200, "bad license ref");

        id = ++assetCount; // parentId is always < id, so cycles/self-parenting are impossible
        assets[id] = Asset({
            creator: msg.sender,
            contentHash: contentHash,
            parentId: parentId,
            licenseRef: licenseRef,
            royaltyBps: royaltyBps,
            parentShareBps: parentShareBps,
            allowRemix: allowRemix,
            allowCommercial: allowCommercial,
            registeredAt: uint64(block.timestamp),
            exists: true
        });
        idByHash[contentHash] = id;

        emit AssetRegistered(id, msg.sender, parentId, contentHash, licenseRef);
    }
}
